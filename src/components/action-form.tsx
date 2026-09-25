"use client";

import { startTransition } from "react";

// A form for a useActionState action that keeps what people typed when the
// action returns an error. React resets uncontrolled fields after a form
// action; submitting through a transition skips that. Before hydration the
// form still posts to the server action natively.
export function ActionForm({
  action,
  ...props
}: Omit<React.ComponentProps<"form">, "action" | "onSubmit"> & { action: (formData: FormData) => void }) {
  return (
    <form
      {...props}
      action={action}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
        startTransition(() => action(formData));
      }}
    />
  );
}
