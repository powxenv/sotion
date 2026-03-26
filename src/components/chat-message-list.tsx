import {
  getToolName,
  isDataUIPart,
  isFileUIPart,
  isReasoningUIPart,
  isToolUIPart,
  type ChatStatus,
} from "ai";
import { Streamdown } from "streamdown";
import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";
import type { ChatMessage, ChatMessagePart } from "#/services/chat/agent";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Idea01Icon, Wrench01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

function toJson<T>(value: T) {
  return JSON.stringify(value, null, 2);
}

function isToolPartDone(part: ChatMessagePart) {
  return (
    isToolUIPart(part) &&
    (part.state === "output-available" ||
      part.state === "output-error" ||
      part.state === "output-denied")
  );
}

function PartStatusIcon({
  isPending,
  icon,
}: {
  isPending: boolean;
  icon: typeof Idea01Icon;
}) {
  if (isPending) {
    return <Spinner className="size-4" />;
  }

  return <HugeiconsIcon className="size-4" icon={icon} />;
}

function MessageMarkdown({
  children,
  isAnimating,
  className,
}: {
  children: string;
  isAnimating: boolean;
  className?: string;
}) {
  return (
    <Streamdown
      className={cn(
        "max-w-none text-sm leading-6 [&_a]:underline [&_code]:rounded [&_code]:bg-black/6 [&_code]:px-1.5 [&_code]:py-0.5 dark:[&_code]:bg-white/10 [&_pre]:overflow-x-auto",
        className,
      )}
      animated
      isAnimating={isAnimating}
    >
      {children}
    </Streamdown>
  );
}

function MessagePart({
  part,
  isStreaming,
  isLastMessage,
  isLastPart,
}: {
  part: ChatMessagePart;
  isStreaming: boolean;
  isLastMessage: boolean;
  isLastPart: boolean;
}) {
  if (part.type === "text" && part.text.trim() !== "") {
    return (
      <MessageMarkdown
        className="text-inherit"
        isAnimating={isStreaming && part.state !== "done"}
      >
        {part.text}
      </MessageMarkdown>
    );
  }

  if (isReasoningUIPart(part)) {
    const isPending =
      isLastMessage && isLastPart && isStreaming && part.state !== "done";

    return (
      <Accordion>
        <AccordionItem value="reasoning">
          <AccordionTrigger className="flex items-center gap-1">
            <PartStatusIcon isPending={isPending} icon={Idea01Icon} />
            Reasoning
          </AccordionTrigger>
          <AccordionContent>
            <MessageMarkdown
              className="text-muted-foreground"
              isAnimating={isStreaming && part.state !== "done"}
            >
              {part.text}
            </MessageMarkdown>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  if (isToolUIPart(part)) {
    const isPending =
      isLastMessage && isLastPart && isStreaming && !isToolPartDone(part);

    return (
      <Accordion>
        <AccordionItem value="tool">
          <AccordionTrigger className="flex items-center gap-1">
            <PartStatusIcon isPending={isPending} icon={Wrench01Icon} />
            Calling {getToolName(part)}
          </AccordionTrigger>
          <AccordionContent>
            {"input" in part && part.input !== undefined ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Input
                </p>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                  {toJson(part.input)}
                </pre>
              </div>
            ) : null}
            {"output" in part && part.output !== undefined ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Output
                </p>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                  {toJson(part.output)}
                </pre>
              </div>
            ) : null}
            {"errorText" in part && part.errorText ? (
              <p className="mt-3 text-sm text-destructive">{part.errorText}</p>
            ) : null}
            {"approval" in part && part.approval ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Approval:{" "}
                {"approved" in part.approval
                  ? part.approval.approved
                    ? "approved"
                    : "denied"
                  : "requested"}
              </p>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  if (part.type === "source-url") {
    return (
      <a
        href={part.url}
        target="_blank"
        rel="noreferrer"
        className="block rounded-xl border px-3 py-2 text-sm hover:bg-muted/60"
      >
        <p className="font-medium">{part.title || part.url}</p>
        <p className="mt-1 text-xs text-muted-foreground">{part.url}</p>
      </a>
    );
  }

  if (part.type === "source-document") {
    return (
      <div className="rounded-xl border px-3 py-2 text-sm">
        <p className="font-medium">{part.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {part.filename || part.mediaType}
        </p>
      </div>
    );
  }

  if (isFileUIPart(part)) {
    const isImage = part.mediaType.startsWith("image/");

    return (
      <div className="rounded-xl border px-3 py-3">
        {isImage ? (
          <img
            src={part.url}
            alt={part.filename || "Generated image"}
            className="max-h-80 rounded-lg border object-contain"
          />
        ) : null}
        <a
          href={part.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-sm underline"
        >
          {part.filename || part.mediaType}
        </a>
      </div>
    );
  }

  if (isDataUIPart(part)) {
    return (
      <div className="rounded-xl border px-3 py-3">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {part.type}
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
          {toJson(part.data)}
        </pre>
      </div>
    );
  }

  return null;
}

export default function ChatMessageList({
  messages,
  status,
  error,
}: {
  messages: ChatMessage[];
  status: ChatStatus;
  error?: Error;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-4 pb-50">
      {messages.map((message, messageIndex) => (
        <div
          key={message.id}
          className={cn(
            message.role === "user"
              ? "ml-auto bg-primary text-primary-foreground text-sm min-h-9 px-4 py-2.5 rounded-xl"
              : "",
          )}
        >
          <div className="flex flex-col">
            {message.parts.map((part, index) => (
              <MessagePart
                key={`${message.id}-${part.type}-${index}`}
                part={part}
                isStreaming={status === "streaming" || status === "submitted"}
                isLastMessage={messageIndex === messages.length - 1}
                isLastPart={index === message.parts.length - 1}
              />
            ))}
          </div>
        </div>
      ))}

      {status === "streaming" || status === "submitted" ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Sotion is thinking...
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : null}
    </div>
  );
}
