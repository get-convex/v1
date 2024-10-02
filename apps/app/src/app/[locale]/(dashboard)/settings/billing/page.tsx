"use client";

import { getLocaleCurrency } from "@/utils/misc";
import { Polar } from "@polar-sh/sdk";
import { api } from "@v1/backend/convex/_generated/api";
import { CURRENCIES, PLANS } from "@v1/backend/convex/schema";
import { Button } from "@v1/ui/button";
import { Switch } from "@v1/ui/switch";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";

export default function BillingSettings() {
  const user = useQuery(api.users.getUser);
  const createCheckout = useAction(api.subscriptions.createCheckout);

  const [selectedPlanInterval, setSelectedPlanInterval] = useState<
    "month" | "year"
  >("month");

  const currency = getLocaleCurrency();

  const handleCreateSubscriptionCheckout = async () => {
    if (!user) {
      return;
    }
    const resp = await createCheckout({
      productPriceId: selectedPlanId,
    });
    console.log("resp", resp);
    if (!resp.url) {
      return;
    }

    window.location.href = resp.url;
  };
  const handleCreateCustomerPortal = async () => {
    if (!user?.customerId) {
      return;
    }
    const customerPortalUrl = undefined;
    if (!customerPortalUrl) {
      return;
    }
    window.location.href = customerPortalUrl;
  };

  // Dummy plans data to make all logic below work
  const plans = {
    free: {
      _id: "free-plan-id",
      planKey: "free-plan-key",
      name: "Free",
      description: "Free plan",
      prices: {
        month: {
          [currency]: {
            amount: 0,
          },
        },
        year: {
          [currency]: {
            amount: 0,
          },
        },
      },
    },
    pro: {
      _id: "pro-plan-id",
      planKey: "pro-plan-key",
      name: "Pro",
      description: "Pro plan",
      prices: {
        month: {
          [currency]: {
            amount: 1000,
          },
        },
        year: {
          [currency]: {
            amount: 1000,
          },
        },
      },
    },
  };

  if (!user || !plans) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-2 p-6 py-2">
        <h2 className="text-xl font-medium text-primary">
          This is a demo app.
        </h2>
        <p className="text-sm font-normal text-primary/60">
          Convex SaaS is a demo app that uses Stripe test environment. You can
          find a list of test card numbers on the{" "}
          <a
            href="https://stripe.com/docs/testing#cards"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary/80 underline"
          >
            Stripe docs
          </a>
          .
        </p>
      </div>

      {/* Plans */}
      <div className="flex w-full flex-col items-start rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-2 p-6">
          <h2 className="text-xl font-medium text-primary">Plan</h2>
          <p className="flex items-start gap-1 text-sm font-normal text-primary/60">
            You are currently on the{" "}
            <span className="flex h-[18px] items-center rounded-md bg-primary/10 px-1.5 text-sm font-medium text-primary/80">
              {user.subscription
                ? user.subscription.planKey.charAt(0).toUpperCase() +
                  user.subscription.planKey.slice(1)
                : "Free"}
            </span>
            plan.
          </p>
        </div>

        {user.subscription?.planId === plans.free._id && (
          <div className="flex w-full flex-col items-center justify-evenly gap-2 border-border p-6 pt-0">
            {Object.values(plans).map((plan) => (
              <div
                key={plan._id}
                tabIndex={0}
                role="button"
                className={`flex w-full select-none items-center rounded-md border border-border hover:border-primary/60 ${
                  selectedPlanId === plan._id && "border-primary/60"
                }`}
                onClick={() => setSelectedPlanId(plan._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSelectedPlanId(plan._id);
                }}
              >
                <div className="flex w-full flex-col items-start p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-primary">
                      {plan.name}
                    </span>
                    {plan._id !== plans.free._id && (
                      <span className="flex items-center rounded-md bg-primary/10 px-1.5 text-sm font-medium text-primary/80">
                        {currency === CURRENCIES.USD ? "$" : "€"}{" "}
                        {/* TODO: remove assertions */}
                        {selectedPlanInterval === "month"
                          ? plan.prices.month[currency]!.amount / 100
                          : plan.prices.year[currency]!.amount / 100}{" "}
                        / {selectedPlanInterval === "month" ? "month" : "year"}
                      </span>
                    )}
                  </div>
                  <p className="text-start text-sm font-normal text-primary/60">
                    {plan.description}
                  </p>
                </div>

                {/* Billing Switch */}
                {plan._id !== plans.free._id && (
                  <div className="flex items-center gap-2 px-4">
                    <label
                      htmlFor="interval-switch"
                      className="text-start text-sm text-primary/60"
                    >
                      {selectedPlanInterval === "month" ? "Monthly" : "Yearly"}
                    </label>
                    <Switch
                      id="interval-switch"
                      checked={selectedPlanInterval === "year"}
                      onCheckedChange={() =>
                        setSelectedPlanInterval((prev) =>
                          prev === "month" ? "year" : "month",
                        )
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {user.subscription && user.subscription.planId !== plans.free._id && (
          <div className="flex w-full flex-col items-center justify-evenly gap-2 border-border p-6 pt-0">
            <div className="flex w-full items-center overflow-hidden rounded-md border border-primary/60">
              <div className="flex w-full flex-col items-start p-4">
                <div className="flex items-end gap-2">
                  <span className="text-base font-medium text-primary">
                    {user.subscription.planKey.charAt(0).toUpperCase() +
                      user.subscription.planKey.slice(1)}
                  </span>
                  <p className="flex items-start gap-1 text-sm font-normal text-primary/60">
                    {user.subscription.cancelAtPeriodEnd === true ? (
                      <span className="flex h-[18px] items-center text-sm font-medium text-red-500">
                        Expires
                      </span>
                    ) : (
                      <span className="flex h-[18px] items-center text-sm font-medium text-green-500">
                        Renews
                      </span>
                    )}
                    on:{" "}
                    {new Date(
                      user.subscription.currentPeriodEnd * 1000,
                    ).toLocaleDateString("en-US")}
                    .
                  </p>
                </div>
                <p className="text-start text-sm font-normal text-primary/60">
                  {plans.pro.description}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex min-h-14 w-full items-center justify-between rounded-lg rounded-t-none border-t border-border bg-secondary px-6 py-3 dark:bg-card">
          <p className="text-sm font-normal text-primary/60">
            You will not be charged for testing the subscription upgrade.
          </p>
          {user.subscription?.planId === plans.free._id && (
            <Button
              type="submit"
              size="sm"
              onClick={handleCreateSubscriptionCheckout}
              disabled={selectedPlanId === plans.free._id}
            >
              Upgrade to PRO
            </Button>
          )}
        </div>
      </div>

      {/* Manage Subscription */}
      <div className="flex w-full flex-col items-start rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-2 p-6">
          <h2 className="text-xl font-medium text-primary">
            Manage Subscription
          </h2>
          <p className="flex items-start gap-1 text-sm font-normal text-primary/60">
            Update your payment method, billing address, and more.
          </p>
        </div>

        <div className="flex min-h-14 w-full items-center justify-between rounded-lg rounded-t-none border-t border-border bg-secondary px-6 py-3 dark:bg-card">
          <p className="text-sm font-normal text-primary/60">
            You will be redirected to the Stripe Customer Portal.
          </p>
          <Button type="submit" size="sm" onClick={handleCreateCustomerPortal}>
            Manage
          </Button>
        </div>
      </div>
    </div>
  );
}
