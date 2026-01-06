import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

type ChatUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
  profileImageUrl: string | null;
};

type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

type ChatThreadSummary = {
  id: string;
  updatedAt: string;
  participants: ChatUser[];
  lastMessage?: ChatMessage;
};

const formatDisplayName = (user?: ChatUser) => {
  if (!user) return "Unknown";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return fullName || user.email || "Unknown";
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export default function ChatPage() {
  const { user } = useAuth();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [messageDraft, setMessageDraft] = useState<string>("");

  const { data: chatUsers = [], isLoading: chatUsersLoading } = useQuery<ChatUser[]>({
    queryKey: ["/api/chats/users"],
  });

  const { data: threads = [], isLoading: threadsLoading } = useQuery<ChatThreadSummary[]>({
    queryKey: ["/api/chats"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chats", selectedThreadId, "messages"],
    enabled: Boolean(selectedThreadId),
  });

  useEffect(() => {
    if (!selectedThreadId && threads.length > 0) {
      setSelectedThreadId(threads[0].id);
    }
  }, [selectedThreadId, threads]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId),
    [threads, selectedThreadId],
  );
  const activeParticipant = activeThread?.participants[0];

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chats", { participantId: selectedUserId });
      return res.json();
    },
    onSuccess: (thread: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setSelectedThreadId(thread.id);
      setSelectedUserId("");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const trimmed = messageDraft.trim();
      if (!trimmed) return;

      let threadId = selectedThreadId;
      if (!threadId && selectedUserId) {
        const threadRes = await apiRequest("POST", "/api/chats", { participantId: selectedUserId });
        const thread = await threadRes.json();
        threadId = thread.id;
        setSelectedThreadId(threadId);
        setSelectedUserId("");
      }

      if (!threadId) return;

      const res = await apiRequest("POST", `/api/chats/${threadId}/messages`, {
        content: trimmed,
      });
      return { threadId, message: await res.json() };
    },
    onSuccess: (payload) => {
      setMessageDraft("");
      if (payload?.threadId) {
        queryClient.invalidateQueries({ queryKey: ["/api/chats", payload.threadId, "messages"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
  });

  const availableUsers = useMemo(
    () => chatUsers.filter((chatUser) => chatUser.id !== user?.id),
    [chatUsers, user?.id],
  );

  return (
    <div className="min-h-full bg-background p-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-80">
          <Card>
            <CardHeader>
              <CardTitle>Chat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chat-user-select">Start a new chat</Label>
                {chatUsersLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger id="chat-user-select">
                      <SelectValue placeholder="Select someone" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length === 0 && (
                        <SelectItem value="none" disabled>
                          No users available
                        </SelectItem>
                      )}
                      {availableUsers.map((chatUser) => (
                        <SelectItem key={chatUser.id} value={chatUser.id}>
                          {formatDisplayName(chatUser)} • {chatUser.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  className="w-full"
                  disabled={!selectedUserId || createThreadMutation.isPending}
                  onClick={() => createThreadMutation.mutate()}
                >
                  Start Chat
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Conversations</Label>
                {threadsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : threads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                ) : (
                  <div className="space-y-2">
                    {threads.map((thread) => {
                      const participant = thread.participants[0];
                      const isActive = thread.id === selectedThreadId;
                      return (
                        <button
                          key={thread.id}
                          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                            isActive ? "border-primary/30 bg-primary/5" : "border-border hover:bg-muted"
                          }`}
                          onClick={() => setSelectedThreadId(thread.id)}
                          type="button"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={participant?.profileImageUrl ?? undefined} />
                            <AvatarFallback>
                              {formatDisplayName(participant).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {formatDisplayName(participant)}
                              </span>
                              {thread.lastMessage?.createdAt && (
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(thread.lastMessage.createdAt)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {thread.lastMessage?.content || "No messages yet"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex-1">
          <Card className="flex h-[70vh] flex-col">
            <CardHeader>
              <CardTitle>{activeParticipant ? formatDisplayName(activeParticipant) : "Messages"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-dashed border-muted px-4 py-3">
                {messagesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-10 w-2/3 ml-auto" />
                    <Skeleton className="h-10 w-1/2" />
                  </div>
                ) : !selectedThreadId ? (
                  <p className="text-sm text-muted-foreground">Select a conversation to start chatting.</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <p>{message.content}</p>
                          <p
                            className={`mt-1 text-xs ${
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {formatTimestamp(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="chat-message">Message</Label>
                <Textarea
                  id="chat-message"
                  placeholder="Write a message..."
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  rows={3}
                  disabled={!selectedThreadId && !selectedUserId}
                />
                <div className="flex items-center justify-end">
                  <Button
                    onClick={() => sendMessageMutation.mutate()}
                    disabled={
                      (!selectedThreadId && !selectedUserId) ||
                      !messageDraft.trim() ||
                      sendMessageMutation.isPending
                    }
                  >
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
