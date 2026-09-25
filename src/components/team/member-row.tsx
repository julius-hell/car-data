"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import {
  createMemberResetLink,
  removeMemberAction,
  updateMemberRole,
  type MemberActionState,
} from "@/app/(protected)/team/actions";
import { FormMessage } from "@/components/form-message";
import { NativeSelect } from "@/components/native-select";
import { ResetLinkButton } from "@/components/reset-link-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ROLES, type Role } from "@/lib/roles";
import { ActionForm } from "@/components/action-form";

export type MemberRowData = {
  userId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  isSelf: boolean;
  cars: string[];
};

export function MemberRow({ member }: { member: MemberRowData }) {
  const t = useTranslations("Team");
  const tRoles = useTranslations("Invitations");
  const [roleState, roleAction, rolePending] = useActionState<MemberActionState, FormData>(
    updateMemberRole.bind(null, member.userId),
    { status: "idle" },
  );
  const [removeState, setRemoveState] = useState<MemberActionState>({ status: "idle" });
  const [removing, startRemove] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const error = roleState.status === "error" ? roleState : removeState.status === "error" ? removeState : null;

  return (
    <li
      data-testid="member"
      data-email={member.email}
      className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            <Link href={`/team/members/${member.userId}`} className="underline-offset-4 hover:underline">
              {member.name}
            </Link>
            {member.isSelf && <span className="text-muted-foreground font-normal"> · {t("you")}</span>}
          </p>
          <p className="text-muted-foreground truncate text-sm">
            {member.email}{" "}
            <span data-testid="email-verified" data-verified={member.emailVerified}>
              · {member.emailVerified ? t("verified") : t("unverified")}
            </span>
          </p>
          {member.cars.length > 0 && (
            <p className="text-muted-foreground text-sm" data-testid="member-cars">
              {t("currentCars", { cars: member.cars.join(", ") })}
            </p>
          )}
        </div>
        <ActionForm action={roleAction} className="flex items-center gap-2">
          <NativeSelect
            name="role"
            defaultValue={member.role}
            aria-label={t("roleOf", { name: member.name })}
            data-testid="member-role"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {tRoles(`role.${role}`)}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" variant="outline" size="sm" disabled={rolePending}>
            {t("saveRole")}
          </Button>
        </ActionForm>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <ResetLinkButton action={createMemberResetLink.bind(null, member.userId)} name={member.name} />
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger
            render={<Button variant="ghost" size="sm" className="text-destructive" disabled={removing} />}
          >
            {t("remove")}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("removeTitle", { name: member.name })}</AlertDialogTitle>
              <AlertDialogDescription>{t("removeDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setConfirmOpen(false);
                  startRemove(async () => setRemoveState(await removeMemberAction(member.userId)));
                }}
              >
                {t("remove")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && (
        <FormMessage kind="error" testId="member-error">
          {t(error.message)}
        </FormMessage>
      )}
      {roleState.status === "saved" && <FormMessage kind="success">{t("roleSaved")}</FormMessage>}
    </li>
  );
}
