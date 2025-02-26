"use client";

import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { api } from "@v1/backend/convex/_generated/api";
import { Button } from "@v1/ui/button";
import { Switch } from "@v1/ui/switch";
import { useQuery } from "convex/react";
import { useState } from "react";

const Plan = ({
  name,
  description,
  isCurrent,
  amount,
  interval,
  onChangeInterval,
}: {
  name: string;
  description: string | null;
  isCurrent: boolean;
  amount: number;
  interval?: "month" | "year";
  onChangeInterval?: () => void;
}) => {
  return (
    <div
      className={`flex w-full select-none items-center rounded-md border border-border ${
        isCurrent && "border-primary/60"
      }`}
    >
      <div className="flex w-full flex-col items-start p-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-primary">{name}</span>
          {Boolean(amount) && (
            <span className="flex items-center rounded-md bg-primary/10 px-1.5 text-sm font-medium text-primary/80">
              ${amount / 100} / {interval === "month" ? "month" : "year"}
            </span>
          )}
        </div>
        <p className="text-start text-sm font-normal text-primary/60">
          {description}
        </p>
      </div>

      {/* Billing Switch */}
      {Boolean(amount) && (
        <div className="flex items-center gap-2 px-4">
          <label
            htmlFor="interval-switch"
            className="text-start text-sm text-primary/60"
          >
            {interval === "month" ? "Monthly" : "Yearly"}
          </label>
          <Switch
            id="interval-switch"
            checked={interval === "year"}
            onCheckedChange={() => onChangeInterval?.()}
          />
        </div>
      )}
    </div>
  );
};

export default function BillingSettings() {
  const user = useQuery(api.users.getUser);
  const products = useQuery(api.subscriptions.listAllProducts);

  const [selectedPlanInterval, setSelectedPlanInterval] = useState<
    "month" | "year"
  >("month");

  if (!user) {
    return null;
  }

  const monthlyProProduct = products?.find(
    (product) => product.recurringInterval === "month",
  );
  const yearlyProProduct = products?.find(
    (product) => product.recurringInterval === "year",
  );

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-2 p-6 py-2">
        <h2 className="text-xl font-medium text-primary">
          This is a demo app.
        </h2>
        <p className="text-sm font-normal text-primary/60">
          Convex SaaS is a demo app that uses Polar test environment. You can
          find a list of test card numbers in this{" "}
          <a
            href="https://stripe.com/docs/testing#cards"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary/80 underline"
          >
            resource from Stripe
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
              {user.subscription ? user.subscription.product.name : "Free"}
            </span>
            plan.
          </p>
        </div>

        {!user.subscription && (
          <div className="flex w-full flex-col items-center justify-evenly gap-2 border-border p-6 pt-0">
            <Plan
              name="Free"
              description="Some of the things, free forever."
              isCurrent={!user.subscription}
              amount={0}
            />
            {selectedPlanInterval === "month" && monthlyProProduct && (
              <Plan
                name={monthlyProProduct.name}
                description={monthlyProProduct.description}
                isCurrent={false}
                amount={monthlyProProduct.prices[0]?.priceAmount ?? 0}
                interval={selectedPlanInterval}
                onChangeInterval={() => {
                  setSelectedPlanInterval((state) =>
                    state === "month" ? "year" : "month",
                  );
                }}
              />
            )}
            {selectedPlanInterval === "year" && yearlyProProduct && (
              <Plan
                name={yearlyProProduct.name}
                description={yearlyProProduct.description}
                isCurrent={false}
                amount={yearlyProProduct.prices[0]?.priceAmount ?? 0}
                interval={selectedPlanInterval}
                onChangeInterval={() => {
                  setSelectedPlanInterval((state) =>
                    state === "month" ? "year" : "month",
                  );
                }}
              />
            )}
          </div>
        )}

        {user.subscription &&
          (user.subscription?.productId === monthlyProProduct?.id ||
            user.subscription?.productId === yearlyProProduct?.id) && (
            <div className="flex w-full flex-col items-center justify-evenly gap-2 border-border p-6 pt-0">
              <div className="flex w-full items-center overflow-hidden rounded-md border border-primary/60">
                <div className="flex w-full flex-col items-start p-4">
                  <div className="flex items-end gap-2">
                    <span className="text-base font-medium text-primary">
                      {user.subscription?.product.name}
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
                        user.subscription.currentPeriodEnd ?? 0 * 1000,
                      ).toLocaleDateString("en-US")}
                      .
                    </p>
                  </div>
                  <p className="text-start text-sm font-normal text-primary/60">
                    {user.subscription?.product.description}
                  </p>
                </div>
              </div>
            </div>
          )}

        {!user.subscription && (
          <div className="flex min-h-14 w-full items-center justify-between rounded-lg rounded-t-none border-t border-border bg-secondary px-6 py-3 dark:bg-card">
            <p className="text-sm font-normal text-primary/60">
              You will not be charged for testing the subscription upgrade.
            </p>
            {monthlyProProduct && yearlyProProduct && (
              <Button type="submit" size="sm" asChild>
                <CheckoutLink
                  polarApi={api.subscriptions}
                  productIds={[
                    selectedPlanInterval === "month"
                      ? monthlyProProduct.id
                      : yearlyProProduct.id,
                  ]}
                >
                  Upgrade to PRO
                </CheckoutLink>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Manage Subscription */}
      {user.subscription && (
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
              You will be redirected to the Polar Customer Portal.
            </p>

            <CustomerPortalLink polarApi={api.subscriptions}>
              <Button type="submit" size="sm">
                Manage
              </Button>
            </CustomerPortalLink>
          </div>
        </div>
      )}
    </div>
  );
}
