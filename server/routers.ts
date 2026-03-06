import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createQuote, getQuoteById, getAllQuotes, createDisposalRequest, getDisposalRequestById, getAllDisposalRequests, getAllVehicleConfigs, upsertVehicleConfig, deleteVehicleConfig, getVehicleConfigById } from "./db";
import { notifyOwner } from "./_core/notification";
import { getAllVehicles } from "@shared/vehicles";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  quotes: router({
    create: publicProcedure
      .input(z.object({
        vehicleId: z.string(),
        departureAddress: z.string(),
        destinationAddress: z.string(),
        distanceKm: z.number().positive(),
        estimatedPrice: z.number().nonnegative(),
        clientName: z.string().min(1),
        clientEmail: z.string().email(),
        clientPhone: z.string().min(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const quote = await createQuote({
          vehicleId: input.vehicleId,
          departureAddress: input.departureAddress,
          destinationAddress: input.destinationAddress,
          distanceKm: input.distanceKm,
          estimatedPrice: input.estimatedPrice,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientPhone: input.clientPhone,
          notes: input.notes,
          status: "pending",
        });
        
        if (quote) {
          await notifyOwner({
            title: "Nouvelle demande de devis",
            content: `${input.clientName} a demandé un devis pour un trajet de ${input.distanceKm}km. Email: ${input.clientEmail}`,
          });
        }
        
        return quote;
      }),
    list: publicProcedure.query(() => getAllQuotes()),
    getById: publicProcedure.input(z.number()).query(({ input }) => getQuoteById(input)),
  }),
  
  disposalRequests: router({
    create: publicProcedure
      .input(z.object({
        vehicleId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
        durationHours: z.number().positive(),
        totalPrice: z.number().nonnegative(),
        clientName: z.string().min(1),
        clientEmail: z.string().email(),
        clientPhone: z.string().min(1),
        eventDescription: z.string().optional(),
        specialRequests: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const request = await createDisposalRequest({
          vehicleId: input.vehicleId,
          startDate: input.startDate,
          endDate: input.endDate,
          durationHours: input.durationHours,
          totalPrice: input.totalPrice,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientPhone: input.clientPhone,
          eventDescription: input.eventDescription,
          specialRequests: input.specialRequests,
          status: "pending",
        });
        
        if (request) {
          await notifyOwner({
            title: "Nouvelle demande de mise à disposition",
            content: `${input.clientName} a demandé une mise à disposition de ${input.durationHours}h. Email: ${input.clientEmail}`,
          });
        }
        
        return request;
      }),
    list: publicProcedure.query(() => getAllDisposalRequests()),
    getById: publicProcedure.input(z.number()).query(({ input }) => getDisposalRequestById(input)),
  }),

  vehicles: router({
    list: publicProcedure.query(async () => {
      const dbConfigs = await getAllVehicleConfigs();
      if (dbConfigs.length > 0) {
        return dbConfigs.map(c => ({
          id: c.vehicleId,
          name: c.name,
          category: c.category,
          description: c.description,
          features: JSON.parse(c.features) as string[],
          pricePerKm: c.pricePerKm / 100,
          pricePerHour: c.pricePerHour,
          minDistance: c.minDistance,
          images: JSON.parse(c.images) as string[],
        }));
      }
      // Fallback to static vehicles
      return getAllVehicles().map(v => ({
        id: v.id,
        name: v.name,
        category: v.category,
        description: v.description,
        features: [...v.features] as string[],
        pricePerKm: v.pricePerKm,
        pricePerHour: v.pricePerHour,
        minDistance: v.minDistance,
        images: [...v.images] as string[],
      }));
    }),
    upsert: adminProcedure
      .input(z.object({
        vehicleId: z.string(),
        name: z.string(),
        category: z.string(),
        description: z.string(),
        features: z.array(z.string()),
        pricePerKm: z.number().positive(),
        pricePerHour: z.number().positive(),
        minDistance: z.number().positive(),
        images: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        await upsertVehicleConfig({
          vehicleId: input.vehicleId,
          name: input.name,
          category: input.category,
          description: input.description,
          features: JSON.stringify(input.features),
          pricePerKm: Math.round(input.pricePerKm * 100),
          pricePerHour: input.pricePerHour,
          minDistance: input.minDistance,
          images: JSON.stringify(input.images),
          active: "yes",
        });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ vehicleId: z.string() }))
      .mutation(async ({ input }) => {
        await deleteVehicleConfig(input.vehicleId);
        return { success: true };
      }),
    addImage: adminProcedure
      .input(z.object({
        vehicleId: z.string(),
        imageUrl: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        const config = await getVehicleConfigById(input.vehicleId);
        if (!config) return { success: false, error: "Vehicle not found" };
        const images: string[] = JSON.parse(config.images);
        images.push(input.imageUrl);
        await upsertVehicleConfig({ ...config, images: JSON.stringify(images) });
        return { success: true };
      }),
    removeImage: adminProcedure
      .input(z.object({
        vehicleId: z.string(),
        imageUrl: z.string(),
      }))
      .mutation(async ({ input }) => {
        const config = await getVehicleConfigById(input.vehicleId);
        if (!config) return { success: false, error: "Vehicle not found" };
        const images: string[] = JSON.parse(config.images).filter((url: string) => url !== input.imageUrl);
        await upsertVehicleConfig({ ...config, images: JSON.stringify(images) });
        return { success: true };
      }),
    uploadImage: adminProcedure
      .input(z.object({
        vehicleId: z.string(),
        base64Data: z.string(),
        fileName: z.string().regex(/^[a-zA-Z0-9._-]+$/, "Invalid file name"),
        contentType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/, "Only image files allowed").default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64Data, "base64");
        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const key = `vehicles/${input.vehicleId}/${Date.now()}-${safeFileName}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { success: true, url };
      }),
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        model: z.string(),
        pricePerKm: z.number().positive(),
        pricePerHour: z.number().positive(),
      }))
      .mutation(async ({ input }) => {
        return { id: Math.random().toString(), ...input };
      }),
  }),
});

export type AppRouter = typeof appRouter;
