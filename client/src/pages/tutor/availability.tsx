import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import type { TutorAvailability } from "@shared/schema";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const minutes = i % 2 === 0 ? "00" : "30";
  const time = `${hour.toString().padStart(2, "0")}:${minutes}`;
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return { value: time, label: `${displayHour}:${minutes} ${ampm}` };
});

interface AvailabilitySlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

function AvailabilityLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TutorAvailabilityPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [formData, setFormData] = useState<AvailabilitySlot>({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
    isActive: true,
  });

  const { data: availability, isLoading } = useQuery<TutorAvailability[]>({
    queryKey: ["/api/tutor/availability"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<AvailabilitySlot, "id">) => {
      return apiRequest("POST", "/api/tutor/availability", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/availability"] });
      setIsDialogOpen(false);
      toast({
        title: "Availability added",
        description: "Your availability slot has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create availability slot.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: AvailabilitySlot) => {
      return apiRequest("PATCH", `/api/tutor/availability/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/availability"] });
      setIsDialogOpen(false);
      setEditingSlot(null);
      toast({
        title: "Availability updated",
        description: "Your availability slot has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update availability slot.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tutor/availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor/availability"] });
      toast({
        title: "Availability removed",
        description: "Your availability slot has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete availability slot.",
        variant: "destructive",
      });
    },
  });

  const openAddDialog = () => {
    setEditingSlot(null);
    setFormData({
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (slot: TutorAvailability) => {
    setEditingSlot({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive,
    });
    setFormData({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (formData.startTime >= formData.endTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    if (editingSlot?.id) {
      updateMutation.mutate({ ...formData, id: editingSlot.id });
    } else {
      const { id, ...createData } = formData;
      createMutation.mutate(createData);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const groupedByDay = (availability || []).reduce((acc, slot) => {
    const day = slot.dayOfWeek;
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<number, TutorAvailability[]>);

  Object.keys(groupedByDay).forEach((day) => {
    groupedByDay[Number(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
            My Availability
          </h1>
          <p className="mt-1 text-muted-foreground">
            Set your weekly recurring availability for tutoring sessions.
          </p>
        </div>
        <Button onClick={openAddDialog} data-testid="button-add-availability">
          <Plus className="mr-2 h-4 w-4" />
          Add Time Slot
        </Button>
      </div>

      {isLoading ? (
        <AvailabilityLoadingSkeleton />
      ) : availability && availability.length > 0 ? (
        <div className="space-y-6">
          {DAYS_OF_WEEK.map((day) => {
            const slots = groupedByDay[day.value] || [];
            if (slots.length === 0) return null;

            return (
              <Card key={day.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    {day.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="group flex items-center gap-2 rounded-md border bg-card p-3 hover-elevate"
                        data-testid={`availability-slot-${slot.id}`}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                        </span>
                        {!slot.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(slot)}
                            data-testid={`button-edit-slot-${slot.id}`}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(slot.id)}
                            data-testid={`button-delete-slot-${slot.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={<Calendar className="h-8 w-8" />}
              title="No availability set"
              description="Add your weekly availability so students can book sessions with you."
              action={{
                label: "Add Time Slot",
                onClick: openAddDialog,
              }}
              testId="empty-availability"
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? "Edit Availability" : "Add Availability"}
            </DialogTitle>
            <DialogDescription>
              {editingSlot
                ? "Update your availability slot."
                : "Add a new weekly recurring time slot."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dayOfWeek">Day of Week</Label>
              <Select
                value={formData.dayOfWeek.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, dayOfWeek: parseInt(value) })
                }
              >
                <SelectTrigger data-testid="select-day-of-week">
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Select
                  value={formData.startTime}
                  onValueChange={(value) =>
                    setFormData({ ...formData, startTime: value })
                  }
                >
                  <SelectTrigger data-testid="select-start-time">
                    <SelectValue placeholder="Start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endTime">End Time</Label>
                <Select
                  value={formData.endTime}
                  onValueChange={(value) =>
                    setFormData({ ...formData, endTime: value })
                  }
                >
                  <SelectTrigger data-testid="select-end-time">
                    <SelectValue placeholder="End time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
                data-testid="switch-is-active"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-availability"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingSlot
                ? "Update"
                : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
