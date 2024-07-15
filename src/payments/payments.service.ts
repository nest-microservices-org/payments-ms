import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.STRIPE_SECRET);

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map((item) => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await this.stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          orderId
        },
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: 'http://localhost:3003/payments/success',
      cancel_url: 'http://localhost:3003/payments/cancel',
    });
    return session;
  }

  async stripeWebhookHandler(request: Request, response: Response) {
    const sig = request.headers['stripe-signature'];
    let event: Stripe.Event;
    //testing
    // const endPointSecret = "whsec_ceeea5137a60825e57197f0ca8baac42ce9165764d7a55c87f86a33e064a7e33"

    //real
    const endPointSecret = "whsec_UxG4DepFUskGwrxtrynHsDAIiZHuQwBG"
    try {
      event = this.stripe.webhooks.constructEvent(request["rawBody"], sig, endPointSecret);
    } catch (error) {
      response.status(400).send(`Webhook error ${error.message}`)
      return;
    }

    switch (event.type) {
      case 'charge.succeeded':
        const charge = event.data.object
        console.log({
          orderId: charge.metadata.orderId
        })
        // Then define and call a function to handle the event payment_intent.succeeded
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    return response.status(200).json({ sig });
  }
}
