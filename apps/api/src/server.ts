import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express, { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from './lib/prisma.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required when NODE_ENV=production');
  }
  console.warn('JWT_SECRET is not set; using an insecure local development fallback.');
  return 'dev-secret-change-me';
}

const jwtSecret = getJwtSecret();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true, credentials: true }));
app.use(express.json());

type AuthedRequest = Request & { userId?: string };
type AsyncRequestHandler<Req extends Request = Request> = (req: Req, res: Response, next: NextFunction) => Promise<unknown>;

function asyncHandler<Req extends Request = Request>(handler: AsyncRequestHandler<Req>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req as Req, res, next)).catch(next);
  };
}

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: '30d' });
}

function publicUser(user: { id: string; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email };
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ message: 'Missing bearer token' });

  try {
    const payload = jwt.verify(token, jwtSecret) as { sub: string };
    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

const registerSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const businessSchema = z.object({
  name: z.string().min(2),
  industry: z.string().min(2),
  audience: z.string().min(2),
  location: z.string().optional(),
  primaryGoal: z.string().min(2),
  channels: z.array(z.enum(['instagram', 'facebook', 'email', 'website', 'in_store'])).min(1)
});

app.get('/health', (_req, res) => res.json({ ok: true, service: 'digitalstep-api' }));

app.post('/auth/register', asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({ data: { name: input.name, email: input.email.toLowerCase(), passwordHash } });
  return res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
}));

app.post('/auth/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  return res.json({ token: signToken(user.id), user: publicUser(user) });
}));

app.get('/me', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, include: { businesses: true } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ user: publicUser(user), businesses: user.businesses });
}));

app.post('/businesses', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const input = businessSchema.parse(req.body);
  const business = await prisma.business.create({ data: { ...input, ownerId: req.userId! } });
  return res.status(201).json({ business });
}));

async function firstBusiness(userId: string) {
  return prisma.business.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } });
}

app.get('/dashboard', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await firstBusiness(req.userId!);
  if (!business) return res.json({ business: null, tasks: [], contentItems: [], campaigns: [], recommendations: [] });
  const [tasks, contentItems, campaigns, recommendations] = await Promise.all([
    prisma.task.findMany({ where: { businessId: business.id }, orderBy: { dueDate: 'asc' }, take: 5 }),
    prisma.contentItem.findMany({ where: { businessId: business.id }, orderBy: { scheduledFor: 'asc' }, take: 5 }),
    prisma.campaign.findMany({ where: { businessId: business.id }, orderBy: { createdAt: 'desc' } }),
    prisma.recommendation.findMany({ where: { businessId: business.id }, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], take: 5 })
  ]);
  return res.json({ business, tasks, contentItems, campaigns, recommendations });
}));

app.get('/tasks', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await firstBusiness(req.userId!);
  return res.json({ tasks: business ? await prisma.task.findMany({ where: { businessId: business.id }, orderBy: { dueDate: 'asc' } }) : [] });
}));

app.get('/content-items', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await firstBusiness(req.userId!);
  return res.json({ contentItems: business ? await prisma.contentItem.findMany({ where: { businessId: business.id }, orderBy: { createdAt: 'desc' } }) : [] });
}));

app.get('/campaigns', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await firstBusiness(req.userId!);
  return res.json({ campaigns: business ? await prisma.campaign.findMany({ where: { businessId: business.id }, orderBy: { createdAt: 'desc' } }) : [] });
}));

app.get('/recommendations', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await firstBusiness(req.userId!);
  return res.json({ recommendations: business ? await prisma.recommendation.findMany({ where: { businessId: business.id }, orderBy: { priority: 'asc' } }) : [] });
}));


function isPrismaKnownRequestError(error: unknown): error is { code: string } {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'PrismaClientKnownRequestError' &&
      'code' in error &&
      typeof error.code === 'string'
  );
}

function isPrismaInitializationError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'PrismaClientInitializationError');
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: 'Invalid request', issues: error.flatten() });
  }

  if (isPrismaKnownRequestError(error)) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const status = error.code === 'P2021' || error.code === 'P2022' ? 503 : 500;
    console.error(error);
    return res.status(status).json({ message: 'Database request failed', code: error.code });
  }

  if (isPrismaInitializationError(error)) {
    console.error(error);
    return res.status(503).json({ message: 'Database connection failed' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Unexpected server error' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`DigitalStep API listening on ${port}`);
});
