"use client";

import {
  ChevronDown,
  Hash,
  MessageSquare,
  Plus,
  Search,
  Send,
  Settings,
  User,
} from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@v1/ui/avatar";
import { Button } from "@v1/ui/button";
import { Input } from "@v1/ui/input";
import { ScrollArea } from "@v1/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@v1/ui/tooltip";

type Message = {
  id: number;
  user: string;
  content: string;
  timestamp: string;
};

type Channel = {
  id: number;
  name: string;
  messages: Message[];
};

export default function SlackClone() {
  const [channels, setChannels] = useState<Channel[]>([
    {
      id: 1,
      name: "general",
      messages: [
        {
          id: 1,
          user: "John Doe",
          content: "Hello everyone!",
          timestamp: "10:30 AM",
        },
        {
          id: 2,
          user: "Jane Smith",
          content: "Hi John, how are you?",
          timestamp: "10:32 AM",
        },
      ],
    },
    { id: 2, name: "random", messages: [] },
  ]);
  const [selectedChannel, setSelectedChannel] = useState<Channel>(channels[0]);
  const [inputMessage, setInputMessage] = useState("");

  const currentUser = {
    name: "Current User",
    avatar: "/placeholder.svg?height=32&width=32",
    status: "Active",
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() === "") return;

    const newMessage: Message = {
      id: selectedChannel.messages.length + 1,
      user: currentUser.name,
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedChannels = channels.map((channel) =>
      channel.id === selectedChannel.id
        ? { ...channel, messages: [...channel.messages, newMessage] }
        : channel,
    );

    setChannels(updatedChannels);
    setSelectedChannel(
      updatedChannels.find((c) => c.id === selectedChannel.id)!,
    );
    setInputMessage("");
  };

  return (
    <div className="grid h-screen w-full grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-r bg-muted">
        <div className="p-4 font-semibold">Slack Clone</div>
        <div className="flex-1 overflow-auto">
          <nav className="grid gap-1 px-2">
            <Button variant="ghost" className="justify-start">
              <MessageSquare className="mr-2 h-4 w-4" />
              Threads
            </Button>
            <Button variant="ghost" className="justify-start">
              <User className="mr-2 h-4 w-4" />
              Direct Messages
            </Button>
          </nav>
          <div className="mt-4 px-2">
            <div className="mb-2 flex items-center justify-between px-2 font-semibold">
              Channels
              <Button variant="ghost" size="icon" className="h-4 w-4">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {channels.map((channel) => (
              <Button
                key={channel.id}
                variant={
                  channel.id === selectedChannel.id ? "secondary" : "ghost"
                }
                className="w-full justify-start"
                onClick={() => setSelectedChannel(channel)}
              >
                <Hash className="mr-2 h-4 w-4" />
                {channel.name}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-auto p-4">
          <Button variant="ghost" className="w-full justify-between">
            <div className="flex items-center">
              <Avatar className="mr-2 h-8 w-8">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="font-medium">{currentUser.name}</div>
                <div className="text-xs text-muted-foreground">
                  {currentUser.status}
                </div>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </div>
      </aside>
      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            <h1 className="font-semibold">{selectedChannel.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Search className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>
        </header>
        <main className="flex flex-1 flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            {selectedChannel.messages.map((message) => (
              <div key={message.id} className="mb-4">
                <div className="flex items-start">
                  <Avatar className="mr-2 h-8 w-8">
                    <AvatarImage
                      src="/placeholder.svg?height=32&width=32"
                      alt={message.user}
                    />
                    <AvatarFallback>{message.user.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <span className="font-semibold">{message.user}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {message.timestamp}
                      </span>
                    </div>
                    <p>{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
          <form
            onSubmit={handleSendMessage}
            className="border-t bg-background p-4"
          >
            <div className="flex items-center gap-2">
              <Input
                placeholder={`Message #${selectedChannel.name}`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" className="h-10 w-10">
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
