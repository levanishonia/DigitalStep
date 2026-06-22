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

function publicUser(user: { id: string; name: string; email: string; preferredLanguage?: string }) {
  return { id: user.id, name: user.name, email: user.email, preferredLanguage: user.preferredLanguage === 'en' ? 'en' : 'ka' };
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

const languageSchema = z.enum(['ka', 'en']);
const registerSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), preferredLanguage: languageSchema.default('ka') });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const channelSchema = z.enum(['instagram', 'facebook', 'email', 'website', 'in_store']);
const contentTypeSchema = z.enum(['post', 'story', 'reel', 'campaign', 'offer']);
const contentStatusSchema = z.enum(['draft', 'planned', 'published']);
const taskStatusSchema = z.enum(['todo', 'in_progress', 'done']);
const taskPrioritySchema = z.enum(['low', 'medium', 'high']);

const emptyToUndefined = (value: unknown) => value === '' || value === null ? undefined : value;
const optionalDateSchema = z.preprocess(emptyToUndefined, z.coerce.date().optional());

const businessSchema = z.object({
  name: z.string().min(2),
  industry: z.string().min(2),
  audience: z.string().min(2),
  location: z.string().optional(),
  primaryGoal: z.string().min(2),
  channels: z.array(channelSchema).min(1),
  contentLanguage: languageSchema.default('ka')
});

const contentItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: contentTypeSchema,
  channel: channelSchema,
  status: contentStatusSchema,
  publishDate: optionalDateSchema
});

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: optionalDateSchema,
  status: taskStatusSchema,
  priority: taskPrioritySchema
});

app.get('/health', (_req, res) => res.json({ ok: true, service: 'digitalstep-api' }));

app.post('/auth/register', asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({ data: { name: input.name, email: input.email.toLowerCase(), passwordHash, preferredLanguage: input.preferredLanguage } });
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


app.put('/me/language', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const input = z.object({ preferredLanguage: languageSchema }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.userId }, data: { preferredLanguage: input.preferredLanguage } });
  return res.json({ user: publicUser(user) });
}));

app.get('/businesses', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const businesses = await prisma.business.findMany({ where: { ownerId: req.userId }, orderBy: { createdAt: 'asc' } });
  return res.json({ businesses });
}));

app.post('/businesses', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const input = businessSchema.parse(req.body);
  const business = await prisma.business.create({
    data: {
      ...input,
      ownerId: req.userId!,
      recommendations: {
        create: [
          {
            title: 'Pick one consistent weekly action',
            description: `Start with a simple recurring marketing habit for ${input.name}, such as a weekly post, email, or in-store update.`,
            priority: 1
          },
          {
            title: 'Match your channels to your audience',
            description: `Focus first on ${input.channels.length === 1 ? 'the selected channel' : 'the selected channels'} that best reach ${input.audience}.`,
            priority: 2
          }
        ]
      }
    }
  });
  return res.status(201).json({ business });
}));


app.put('/businesses/current/content-language', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await requireFirstBusiness(req.userId!, res);
  if (!business) return;
  const input = z.object({ contentLanguage: languageSchema }).parse(req.body);
  const updated = await prisma.business.update({ where: { id: business.id }, data: { contentLanguage: input.contentLanguage } });
  return res.json({ business: updated });
}));

function dayRangeFromQuery(start?: unknown, end?: unknown) {
  const startDate = typeof start === 'string' && start ? new Date(`${start}T00:00:00`) : undefined;
  const endDate = typeof end === 'string' && end ? new Date(`${end}T23:59:59.999`) : undefined;
  return { startDate, endDate };
}

function dateWhere(startDate?: Date, endDate?: Date) {
  if (startDate && endDate) return { gte: startDate, lte: endDate };
  if (startDate) return { gte: startDate };
  if (endDate) return { lte: endDate };
  return undefined;
}

function startOfWeek(date = new Date()) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function firstBusiness(userId: string) {
  return prisma.business.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } });
}

async function requireFirstBusiness(userId: string, res: Response) {
  const business = await firstBusiness(userId);
  if (!business) {
    res.status(404).json({ message: 'Create a business before adding marketing work.' });
    return null;
  }
  return business;
}

app.get('/dashboard', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await firstBusiness(req.userId!);
  if (!business) return res.json({ business: null, tasks: [], contentItems: [], campaigns: [], recommendations: [] });
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const [tasks, contentItems, campaigns, recommendations] = await Promise.all([
    prisma.task.findMany({
      where: { businessId: business.id, status: { not: 'done' }, dueDate: { gte: startOfToday, lte: endOfToday } },
      orderBy: { dueDate: 'asc' },
      take: 5
    }),
    prisma.contentItem.findMany({
      where: { businessId: business.id, status: { in: ['draft', 'planned'] }, OR: [{ publishDate: null }, { publishDate: { gte: startOfToday } }] },
      orderBy: [{ publishDate: 'asc' }, { createdAt: 'desc' }],
      take: 5
    }),
    prisma.campaign.findMany({ where: { businessId: business.id, status: 'active' }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.recommendation.findMany({ where: { businessId: business.id }, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], take: 5 })
  ]);
  return res.json({ business, tasks, contentItems, campaigns, recommendations });
}));

app.get('/tasks', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await firstBusiness(req.userId!);
  const status = taskStatusSchema.optional().safeParse(req.query.status);
  const { startDate, endDate } = dayRangeFromQuery(req.query.startDate, req.query.endDate);
  const dueDate = dateWhere(startDate, endDate);
  const where = { businessId: business?.id, ...(status.success && status.data ? { status: status.data } : {}), ...(dueDate ? { dueDate } : {}) };
  return res.json({ tasks: business ? await prisma.task.findMany({ where, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }] }) : [] });
}));

app.post('/tasks', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await requireFirstBusiness(req.userId!, res);
  if (!business) return;
  const input = taskSchema.parse(req.body);
  const task = await prisma.task.create({ data: { ...input, description: input.description?.trim() || null, businessId: business.id } });
  return res.status(201).json({ task });
}));

app.put('/tasks/:id', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await requireFirstBusiness(req.userId!, res);
  if (!business) return;
  const input = taskSchema.parse(req.body);
  const task = await prisma.task.update({ where: { id: req.params.id, businessId: business.id }, data: { ...input, description: input.description?.trim() || null } });
  return res.json({ task });
}));

app.delete('/tasks/:id', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await requireFirstBusiness(req.userId!, res);
  if (!business) return;
  await prisma.task.delete({ where: { id: req.params.id, businessId: business.id } });
  return res.status(204).send();
}));

app.get('/content-items', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await firstBusiness(req.userId!);
  const status = contentStatusSchema.optional().safeParse(req.query.status);
  const type = contentTypeSchema.optional().safeParse(req.query.type);
  const { startDate, endDate } = dayRangeFromQuery(req.query.startDate, req.query.endDate);
  const publishDate = dateWhere(startDate, endDate);
  const where = { businessId: business?.id, ...(status.success && status.data ? { status: status.data } : {}), ...(type.success && type.data ? { type: type.data } : {}), ...(publishDate ? { publishDate } : {}) };
  return res.json({ contentItems: business ? await prisma.contentItem.findMany({ where, orderBy: [{ publishDate: 'asc' }, { createdAt: 'desc' }] }) : [] });
}));

app.post('/content-items', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await requireFirstBusiness(req.userId!, res);
  if (!business) return;
  const input = contentItemSchema.parse(req.body);
  const contentItem = await prisma.contentItem.create({ data: { ...input, description: input.description?.trim() || null, notes: input.description?.trim() || null, scheduledFor: input.publishDate, businessId: business.id } });
  return res.status(201).json({ contentItem });
}));

app.put('/content-items/:id', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await requireFirstBusiness(req.userId!, res);
  if (!business) return;
  const input = contentItemSchema.parse(req.body);
  const contentItem = await prisma.contentItem.update({ where: { id: req.params.id, businessId: business.id }, data: { ...input, description: input.description?.trim() || null, notes: input.description?.trim() || null, scheduledFor: input.publishDate } });
  return res.json({ contentItem });
}));

app.delete('/content-items/:id', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await requireFirstBusiness(req.userId!, res);
  if (!business) return;
  await prisma.contentItem.delete({ where: { id: req.params.id, businessId: business.id } });
  return res.status(204).send();
}));


app.get('/calendar', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await firstBusiness(req.userId!);
  if (!business) return res.json({ tasks: [], contentItems: [] });
  const { startDate, endDate } = dayRangeFromQuery(req.query.startDate, req.query.endDate);
  const [tasks, contentItems] = await Promise.all([
    prisma.task.findMany({ where: { businessId: business.id, dueDate: dateWhere(startDate, endDate) }, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }] }),
    prisma.contentItem.findMany({ where: { businessId: business.id, publishDate: dateWhere(startDate, endDate) }, orderBy: [{ publishDate: 'asc' }, { createdAt: 'desc' }] })
  ]);
  return res.json({ tasks, contentItems });
}));


type GeneratedPlanTask = { id: string; day: string; title: string; description: string; dueDate: string; priority: 'low' | 'medium' | 'high' };
type GeneratedPlanContent = { id: string; day: string; title: string; description: string; type: 'post' | 'story' | 'reel' | 'campaign' | 'offer'; channel: 'instagram' | 'facebook' | 'email' | 'website' | 'in_store'; publishDate: string };
type GeneratedWeeklyPlan = { industryTemplate: string; weekStart: string; weekEnd: string; focus: string; tasks: GeneratedPlanTask[]; contentItems: GeneratedPlanContent[] };

type IndustryTemplate = {
  label: string;
  focus: string;
  contentThemes: string[];
  taskThemes: { title: string; description: string; priority: 'low' | 'medium' | 'high' }[];
};

const marketingTemplates: Record<string, IndustryTemplate> = {
  restaurant: {
    label: 'Restaurant',
    focus: 'drive reservations, visits, and repeat orders',
    contentThemes: ['feature a signature dish', 'share a behind-the-scenes kitchen story', 'promote a weekday offer', 'highlight a customer review'],
    taskThemes: [
      { title: 'Update menu and opening-hour details', description: 'Check website, social profiles, and local listings for accurate menu, hours, location, and booking links.', priority: 'high' },
      { title: 'Collect fresh dining reviews', description: 'Ask recent happy customers to leave a short review and save the best quote for future posts.', priority: 'medium' },
      { title: 'Follow up with loyal customers', description: 'Send a thank-you or comeback message to regulars with a simple reason to visit this week.', priority: 'medium' }
    ]
  },
  'clothing store': {
    label: 'Clothing Store',
    focus: 'showcase new arrivals and convert browsers into shoppers',
    contentThemes: ['style a new-arrivals outfit', 'share a fit or fabric tip', 'promote a limited rack or bundle', 'show customer styling inspiration'],
    taskThemes: [
      { title: 'Refresh featured products', description: 'Update website or profile highlights with current sizes, prices, and best-selling styles.', priority: 'high' },
      { title: 'Follow up with recent shoppers', description: 'Invite recent customers back with a styling suggestion tied to their last purchase.', priority: 'medium' },
      { title: 'Collect customer photos or reviews', description: 'Ask shoppers for permission to reuse photos, testimonials, or outfit feedback.', priority: 'medium' }
    ]
  },
  'beauty salon': {
    label: 'Beauty Salon',
    focus: 'fill appointment slots and build trust with transformations',
    contentThemes: ['share a before-and-after result', 'educate on aftercare', 'promote an open appointment slot', 'spotlight a customer testimonial'],
    taskThemes: [
      { title: 'Review appointment availability', description: 'Identify open slots and prepare one clear booking promotion for the week.', priority: 'high' },
      { title: 'Follow up after appointments', description: 'Message recent clients with aftercare tips and a rebooking reminder.', priority: 'medium' },
      { title: 'Request transformation reviews', description: 'Ask satisfied clients for reviews or permission to share their results.', priority: 'medium' }
    ]
  },
  'e-commerce': {
    label: 'E-commerce',
    focus: 'increase product discovery and recover interested buyers',
    contentThemes: ['feature a best-selling product', 'answer a common product question', 'promote a bundle or shipping offer', 'share customer proof'],
    taskThemes: [
      { title: 'Update product pages', description: 'Improve titles, photos, descriptions, and calls-to-action for priority products.', priority: 'high' },
      { title: 'Send cart or browse follow-up', description: 'Prepare an email follow-up for shoppers who viewed or abandoned key products.', priority: 'medium' },
      { title: 'Collect product reviews', description: 'Ask recent buyers for reviews and add the strongest proof to product pages.', priority: 'medium' }
    ]
  },
  'travel agency': { label: 'Travel Agency', focus: 'inspire inquiries and package bookings', contentThemes: ['spotlight a destination', 'share a travel planning tip', 'promote a package or deadline', 'share traveler feedback'], taskThemes: [{ title: 'Refresh featured offers', description: 'Update current packages, prices, deadlines, and inquiry links.', priority: 'high' }, { title: 'Follow up with warm leads', description: 'Contact recent inquirers with one relevant itinerary idea.', priority: 'medium' }, { title: 'Collect traveler testimonials', description: 'Ask past travelers for a review or short trip highlight.', priority: 'medium' }] },
  education: { label: 'Education', focus: 'increase inquiries and learner engagement', contentThemes: ['explain a program benefit', 'share a student success story', 'promote enrollment or trial dates', 'answer a common admissions question'], taskThemes: [{ title: 'Update enrollment information', description: 'Check program pages, dates, pricing, and inquiry forms.', priority: 'high' }, { title: 'Follow up with prospective students', description: 'Send helpful next steps to recent inquiries.', priority: 'medium' }, { title: 'Collect student feedback', description: 'Ask students or parents for testimonials and outcomes.', priority: 'medium' }] },
  fitness: { label: 'Fitness', focus: 'drive class attendance and membership consistency', contentThemes: ['share a quick workout tip', 'spotlight a class or trainer', 'promote a challenge or trial', 'share member progress'], taskThemes: [{ title: 'Update class schedule', description: 'Confirm schedules, booking links, and any class changes.', priority: 'high' }, { title: 'Follow up with inactive members', description: 'Invite lapsed members back with a friendly next-session suggestion.', priority: 'medium' }, { title: 'Collect member wins', description: 'Ask members for progress stories or reviews.', priority: 'medium' }] },
  'real estate': { label: 'Real Estate', focus: 'generate qualified inquiries and build local authority', contentThemes: ['feature a listing or neighborhood', 'share a market tip', 'promote an open house or consultation', 'share client success'], taskThemes: [{ title: 'Update listing details', description: 'Check property details, photos, availability, and contact links.', priority: 'high' }, { title: 'Follow up with buyer or seller leads', description: 'Send one relevant market insight to active leads.', priority: 'medium' }, { title: 'Collect client reviews', description: 'Ask past clients for testimonials about their buying or selling experience.', priority: 'medium' }] },
  services: { label: 'Services', focus: 'build trust and convert inquiries into booked work', contentThemes: ['explain a core service', 'share a helpful maintenance tip', 'promote a consultation or package', 'share customer proof'], taskThemes: [{ title: 'Update service pages', description: 'Confirm service descriptions, pricing cues, location coverage, and inquiry links.', priority: 'high' }, { title: 'Follow up with open quotes', description: 'Contact prospects who requested details but have not booked yet.', priority: 'medium' }, { title: 'Collect service reviews', description: 'Ask recent customers for feedback and permission to share outcomes.', priority: 'medium' }] }
};

function normalizeIndustry(industry: string) {
  const value = industry.toLowerCase().trim();
  if (value.includes('restaurant') || value.includes('cafe') || value.includes('food')) return 'restaurant';
  if (value.includes('clothing') || value.includes('fashion') || value.includes('apparel')) return 'clothing store';
  if (value.includes('beauty') || value.includes('salon') || value.includes('spa')) return 'beauty salon';
  if (value.includes('commerce') || value.includes('online') || value.includes('shop')) return 'e-commerce';
  if (value.includes('travel') || value.includes('tour')) return 'travel agency';
  if (value.includes('education') || value.includes('school') || value.includes('course')) return 'education';
  if (value.includes('fitness') || value.includes('gym') || value.includes('yoga')) return 'fitness';
  if (value.includes('real estate') || value.includes('property')) return 'real estate';
  return 'services';
}

function preferredChannel(channels: string[], preferred: string[]) {
  return (preferred.find((channel) => channels.includes(channel)) ?? channels[0] ?? 'instagram') as GeneratedPlanContent['channel'];
}

function generateMarketingPlan(business: Awaited<ReturnType<typeof firstBusiness>>, weekStart: Date): GeneratedWeeklyPlan {
  if (!business) throw new Error('Business is required');
  const useGeorgian = business.contentLanguage !== 'en';
  const templateKey = normalizeIndustry(business.industry);
  const template = marketingTemplates[templateKey];
  const channels = business.channels as string[];
  const weekEnd = addDays(weekStart, 6);
  const contentDays = [0, 1, 2, 3, 4, 5];
  const contentItems = template.contentThemes.map((theme, index) => {
    const channel = index === 1 ? preferredChannel(channels, ['instagram', 'facebook']) : index === 2 ? preferredChannel(channels, ['email', 'in_store', 'website', 'facebook', 'instagram']) : preferredChannel(channels, ['instagram', 'facebook', 'website', 'email', 'in_store']);
    const date = addDays(weekStart, contentDays[index]);
    const location = business.location ? ` in ${business.location}` : '';
    return { id: `content-${index + 1}`, day: date.toLocaleDateString(useGeorgian ? 'ka-GE' : 'en-US', { weekday: 'long' }), title: useGeorgian ? `${business.industry}: ${theme}` : `${template.label}: ${theme}`, description: useGeorgian ? `${business.audience}${location ? ` (${business.location})` : ''} აუდიტორიისთვის დაუკავშირეთ ეს იდეა მიზანს: ${business.primaryGoal}.` : `For ${business.audience}${location}, connect this ${theme} to the goal: ${business.primaryGoal}.`, type: (index === 1 ? 'story' : index === 2 ? 'offer' : 'post') as GeneratedPlanContent['type'], channel, publishDate: dateKey(date) };
  });
  const tasks = template.taskThemes.concat([{ title: 'Review weekly performance', description: 'Check engagement, inquiries, reviews, and completed tasks. Decide what to repeat next week.', priority: 'low' as const }]).map((task, index) => {
    const date = addDays(weekStart, [0, 2, 4, 6][index] ?? index);
    return { id: `task-${index + 1}`, day: date.toLocaleDateString(useGeorgian ? 'ka-GE' : 'en-US', { weekday: 'long' }), title: useGeorgian ? task.title.replace('Update', 'განაახლეთ').replace('Collect', 'შეაგროვეთ').replace('Follow up', 'დაუკავშირდით').replace('Review', 'გადახედეთ') : task.title, description: useGeorgian ? `${task.description} იმოქმედეთ მოკლედ, მკაფიოდ და ბიზნეს მიზანზე მორგებულად.` : task.description, dueDate: dateKey(date), priority: task.priority };
  });
  return { industryTemplate: useGeorgian ? business.industry : template.label, weekStart: dateKey(weekStart), weekEnd: dateKey(weekEnd), focus: useGeorgian ? `ამ კვირაში მთავარი ფოკუსია ${business.audience} აუდიტორიასთან მიზანმიმართული კომუნიკაცია და მიზანი: ${business.primaryGoal}.` : `This week, focus on ${template.focus} for ${business.audience}.`, tasks, contentItems };
}

const generatedTaskSchema = z.object({ title: z.string().min(1), description: z.string().optional(), dueDate: z.coerce.date(), priority: taskPrioritySchema });
const generatedContentSchema = z.object({ title: z.string().min(1), description: z.string().optional(), type: contentTypeSchema, channel: channelSchema, publishDate: z.coerce.date() });
const acceptWeeklyPlanSchema = z.object({ tasks: z.array(generatedTaskSchema), contentItems: z.array(generatedContentSchema) });

app.get('/weekly-plan', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await firstBusiness(req.userId!);
  if (!business) return res.json({ generatedPlan: null, tasks: [], plannedPosts: [], campaigns: [], missingActions: [] });
  const weekStart = typeof req.query.weekStart === 'string' ? startOfWeek(new Date(`${req.query.weekStart}T12:00:00`)) : startOfWeek();
  const weekEnd = addDays(weekStart, 6);
  weekEnd.setHours(23, 59, 59, 999);
  const [tasks, plannedPosts, campaigns] = await Promise.all([
    prisma.task.findMany({ where: { businessId: business.id, status: { not: 'done' }, dueDate: { gte: weekStart, lte: weekEnd } }, orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }] }),
    prisma.contentItem.findMany({ where: { businessId: business.id, status: { in: ['draft', 'planned'] }, publishDate: { gte: weekStart, lte: weekEnd } }, orderBy: [{ publishDate: 'asc' }, { createdAt: 'desc' }] }),
    prisma.campaign.findMany({ where: { businessId: business.id, status: { in: ['planned', 'active'] }, OR: [{ startDate: null }, { startDate: { lte: weekEnd } }], AND: [{ OR: [{ endDate: null }, { endDate: { gte: weekStart } }] }] }, orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }] })
  ]);
  const generatedPlan = generateMarketingPlan(business, weekStart);
  const missingActions = [
    ...(tasks.length === 0 ? [{ id: 'tasks', title: 'Add weekly tasks', description: 'Accept the smart plan or create at least one due task so your next marketing action is clear.' }] : []),
    ...(plannedPosts.length === 0 ? [{ id: 'posts', title: 'Schedule content', description: 'Accept the smart plan or plan one post, story, email, offer, or website update for this week.' }] : []),
    ...(campaigns.length === 0 ? [{ id: 'campaigns', title: 'Review campaigns', description: 'No planned or active campaigns overlap this week.' }] : [])
  ];
  return res.json({ generatedPlan, tasks, plannedPosts, campaigns, missingActions });
}));

app.post('/weekly-plan/accept', requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const business = await requireFirstBusiness(req.userId!, res);
  if (!business) return;
  const input = acceptWeeklyPlanSchema.parse(req.body);
  const [tasks, contentItems] = await prisma.$transaction([
    prisma.task.createMany({ data: input.tasks.map((task) => ({ title: task.title, description: task.description?.trim() || null, dueDate: task.dueDate, priority: task.priority, status: 'todo', businessId: business.id })) }),
    prisma.contentItem.createMany({ data: input.contentItems.map((item) => ({ title: item.title, description: item.description?.trim() || null, notes: item.description?.trim() || null, type: item.type, channel: item.channel, publishDate: item.publishDate, scheduledFor: item.publishDate, status: 'planned', businessId: business.id })) })
  ]);
  return res.status(201).json({ tasksCreated: tasks.count, contentItemsCreated: contentItems.count });
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

    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Item not found' });
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
