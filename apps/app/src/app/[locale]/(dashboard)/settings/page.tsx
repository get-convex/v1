"use client";

import { useScopedI18n } from "@/locales/client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { api } from "@v1/backend/convex/_generated/api";
import type { Id } from "@v1/backend/convex/_generated/dataModel";
import * as validators from "@v1/backend/convex/utils/validators";
import { Button } from "@v1/ui/button";
import { Input } from "@v1/ui/input";
import { UploadInput } from "@v1/ui/upload-input";
import { useDoubleCheck } from "@v1/ui/utils";
import type { UploadFileResponse } from "@xixixao/uploadstuff/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Upload } from "lucide-react";
import { useState } from "react";

export default function DashboardSettings() {
  const t = useScopedI18n("settings");
  const user = useQuery(api.users.getUser);
  const { signOut } = useAuthActions();
  const updateUserImage = useMutation(api.users.updateUserImage);
  const updateUsername = useMutation(api.users.updateUsername);
  const removeUserImage = useMutation(api.users.removeUserImage);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const deleteCurrentUserAccount = useAction(
    api.users.deleteCurrentUserAccount,
  );
  const { doubleCheck, getButtonProps } = useDoubleCheck();

  const handleUpdateUserImage = (uploaded: UploadFileResponse[]) => {
    return updateUserImage({
      imageId: (uploaded[0]?.response as { storageId: Id<"_storage"> })
        .storageId,
    });
  };

  const handleDeleteAccount = async () => {
    await deleteCurrentUserAccount();
    signOut();
  };

  const usernameForm = useForm({
    validatorAdapter: zodValidator(),
    defaultValues: {
      username: user?.username,
    },
    onSubmit: async ({ value }) => {
      await updateUsername({ username: value.username || "" });
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col gap-6">
      {/* Avatar */}
      <div className="flex w-full flex-col items-start rounded-lg border border-border bg-card">
        <div className="flex w-full items-start justify-between rounded-lg p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-medium text-primary">
              {t("avatar.title")}
            </h2>
            <p className="text-sm font-normal text-primary/60">
              {t("avatar.description")}
            </p>
          </div>
          <label
            htmlFor="avatar_field"
            className="group relative flex cursor-pointer overflow-hidden rounded-full transition active:scale-95"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                className="h-20 w-20 rounded-full object-cover"
                alt={user.username ?? user.email}
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-lime-400 from-10% via-cyan-300 to-blue-500" />
            )}
            <div className="absolute z-10 hidden h-full w-full items-center justify-center bg-primary/40 group-hover:flex">
              <Upload className="h-6 w-6 text-secondary" />
            </div>
          </label>
          <UploadInput
            id="avatar_field"
            type="file"
            accept="image/*"
            className="peer sr-only"
            required
            tabIndex={user ? -1 : 0}
            generateUploadUrl={generateUploadUrl}
            onUploadComplete={handleUpdateUserImage}
          />
        </div>
        <div className="flex min-h-14 w-full items-center justify-between rounded-lg rounded-t-none border-t border-border bg-secondary px-6 dark:bg-card">
          <p className="text-sm font-normal text-primary/60">
            {t("avatar.uploadHint")}
          </p>
          {user.avatarUrl && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                removeUserImage({});
              }}
            >
              {t("avatar.resetButton")}
            </Button>
          )}
        </div>
      </div>

      {/* Username */}
      <form
        className="flex w-full flex-col items-start rounded-lg border border-border bg-card"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          usernameForm.handleSubmit();
        }}
      >
        <div className="flex w-full flex-col gap-4 rounded-lg p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-medium text-primary">Your Username</h2>
            <p className="text-sm font-normal text-primary/60">
              This is your username. It will be displayed on your profile.
            </p>
          </div>
          <usernameForm.Field
            name="username"
            validators={{
              onSubmit: validators.username,
            }}
            // biome-ignore lint/correctness/noChildrenProp: <explanation>
            children={(field) => (
              <Input
                placeholder="Username"
                autoComplete="off"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                className={`w-80 bg-transparent ${
                  field.state.meta?.errors.length > 0 &&
                  "border-destructive focus-visible:ring-destructive"
                }`}
              />
            )}
          />
          {usernameForm.state.fieldMeta.username?.errors.length > 0 && (
            <p className="text-sm text-destructive dark:text-destructive-foreground">
              {usernameForm.state.fieldMeta.username?.errors.join(" ")}
            </p>
          )}
        </div>
        <div className="flex min-h-14 w-full items-center justify-between rounded-lg rounded-t-none border-t border-border bg-secondary px-6 dark:bg-card">
          <p className="text-sm font-normal text-primary/60">
            Please use 32 characters at maximum.
          </p>
          <Button type="submit" size="sm">
            Save
          </Button>
        </div>
      </form>

      {/* Delete Account */}
      <div className="flex w-full flex-col items-start rounded-lg border border-destructive bg-card">
        <div className="flex flex-col gap-2 p-6">
          <h2 className="text-xl font-medium text-primary">
            {t("deleteAccount.title")}
          </h2>
          <p className="text-sm font-normal text-primary/60">
            {t("deleteAccount.description")}
          </p>
        </div>
        <div className="flex min-h-14 w-full items-center justify-between rounded-lg rounded-t-none border-t border-border bg-red-500/10 px-6 dark:bg-red-500/10">
          <p className="text-sm font-normal text-primary/60">
            {t("deleteAccount.warning")}
          </p>
          <Button
            size="sm"
            variant="destructive"
            {...getButtonProps({
              onClick: doubleCheck ? handleDeleteAccount : undefined,
            })}
          >
            {doubleCheck
              ? t("deleteAccount.confirmButton")
              : t("deleteAccount.deleteButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
