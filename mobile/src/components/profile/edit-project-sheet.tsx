import { useState } from 'react';
import { X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { newProject } from '@/lib/profile';
import type { MonthYear, ProfileProject } from '@/types/profile';

import { BulletListEditor } from './bullet-list-editor';
import { MonthYearPicker } from './month-year-picker';

export interface EditProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProfileProject | null;
  onSave: (item: ProfileProject) => void;
  onDelete?: () => void;
}

function ProjectForm({
  project,
  onOpenChange,
  onSave,
  onDelete,
}: Omit<EditProjectSheetProps, 'open'>) {
  const [name, setName] = useState(project?.name ?? '');
  const [role, setRole] = useState(project?.role ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [technologiesText, setTechnologiesText] = useState(
    project?.technologies?.join(', ') ?? ''
  );
  const [inProgress, setInProgress] = useState(project?.inProgress ?? false);
  const [startDate, setStartDate] = useState<MonthYear | null>(project?.startDate ?? null);
  const [endDate, setEndDate] = useState<MonthYear | null>(project?.endDate ?? null);
  const [bullets, setBullets] = useState<string[]>(project?.bullets ?? []);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Project name is required');
      return;
    }

    const technologies = technologiesText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      id: project?.id ?? newProject().id,
      name: trimmedName,
      role: role.trim() || undefined,
      description: description.trim() || undefined,
      technologies,
      bullets,
      links: project?.links ?? [],
      startDate,
      endDate: inProgress ? null : endDate,
      inProgress,
    });
    onOpenChange(false);
  };

  return (
    <>
      <View className="mb-3 flex-row items-center justify-between">
        <SheetTitle>{project ? 'Edit project' : 'Add project'}</SheetTitle>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          onPress={() => onOpenChange(false)}
          className="rounded-md p-1">
          <Icon icon={X} size={16} strokeWidth={2} className="text-muted-foreground" />
        </Pressable>
      </View>

      {error ? (
        <View className="mb-3 rounded-md bg-destructive/10 p-2.5">
          <Text className="text-xs text-destructive">{error}</Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-4 pb-4">
          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">PROJECT NAME *</Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="e.g. JobVault Mobile"
              accessibilityLabel="Project name"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">ROLE</Text>
            <Input
              value={role}
              onChangeText={setRole}
              placeholder="e.g. Lead Developer, Creator"
              accessibilityLabel="Role"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">TECHNOLOGIES</Text>
            <Input
              value={technologiesText}
              onChangeText={setTechnologiesText}
              placeholder="e.g. React Native, TypeScript, Expo"
              accessibilityLabel="Technologies"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">DESCRIPTION</Text>
            <Textarea
              value={description}
              onChangeText={setDescription}
              placeholder="Brief overview of what the project does…"
              numberOfLines={3}
              accessibilityLabel="Project description"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">START DATE</Text>
            <MonthYearPicker value={startDate} onChange={setStartDate} />
          </View>

          <Pressable
            onPress={() => setInProgress(!inProgress)}
            className="flex-row items-center gap-2 pt-1 active:opacity-75">
            <Checkbox checked={inProgress} onCheckedChange={setInProgress} />
            <Text className="text-sm text-foreground">Project is ongoing / in progress</Text>
          </Pressable>

          {!inProgress ? (
            <View className="gap-1.5">
              <Text className="font-sans-medium text-xs text-muted-foreground">END DATE</Text>
              <MonthYearPicker value={endDate} onChange={setEndDate} />
            </View>
          ) : null}

          <View className="gap-1.5 pt-1">
            <Text className="font-sans-medium text-xs text-muted-foreground">BULLET POINTS</Text>
            <BulletListEditor bullets={bullets} onChange={setBullets} />
          </View>

          <View className="flex-row items-center gap-2 pt-4">
            {onDelete && project ? (
              <Button
                variant="destructive"
                onPress={() => {
                  onDelete();
                  onOpenChange(false);
                }}
                className="flex-1">
                Delete
              </Button>
            ) : null}
            <Button onPress={handleSave} className="flex-1">
              Save
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

export function EditProjectSheet({
  open,
  onOpenChange,
  project,
  onSave,
  onDelete,
}: EditProjectSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose>
        {open ? (
          <ProjectForm
            key={project?.id ?? 'new'}
            project={project}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onDelete={onDelete}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
