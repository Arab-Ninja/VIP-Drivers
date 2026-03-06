import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createQuote, getQuoteById, getAllQuotes, createDisposalRequest, getDisposalRequestById, getAllDisposalRequests } from "./db";
import { notifyOwner } from "./_core/notification";

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
    list: publicProcedure.query(() => [
      { id: 'classe-e', name: 'Mercedes Classe E', model: 'E-Class', pricePerKm: 3, pricePerHour: 85 },
      { id: 'classe-s', name: 'Mercedes Classe S', model: 'S-Class', pricePerKm: 4, pricePerHour: 120 },
      { id: 'classe-v', name: 'Mercedes Classe V', model: 'V-Class', pricePerKm: 3.5, pricePerHour: 95 },
    ]),
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
    delete: publicProcedure
      .input(z.object({ vehicleId: z.string() }))
      .mutation(async ({ input }) => {
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
