import { useState } from 'react';
import { X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { newExperience } from '@/lib/profile';
import type { EmploymentType, MonthYear, ProfileExperience } from '@/types/profile';

import { BulletListEditor } from './bullet-list-editor';
import { MonthYearPicker } from './month-year-picker';

const EMPLOYMENT_OPTIONS = [
  { value: 'none', label: 'Select type…' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
  { value: 'self-employed', label: 'Self-employed' },
] as const;

export interface EditExperienceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experience: ProfileExperience | null;
  onSave: (item: ProfileExperience) => void;
  onDelete?: () => void;
}

function ExperienceForm({
  experience,
  onOpenChange,
  onSave,
  onDelete,
}: Omit<EditExperienceSheetProps, 'open'>) {
  const [company, setCompany] = useState(experience?.company ?? '');
  const [role, setRole] = useState(experience?.role ?? '');
  const [employmentType, setEmploymentType] = useState<EmploymentType | 'none'>(
    experience?.employmentType ?? 'none'
  );
  const [location, setLocation] = useState(experience?.location ?? '');
  const [startDate, setStartDate] = useState<MonthYear | null>(experience?.startDate ?? null);
  const [endDate, setEndDate] = useState<MonthYear | null>(experience?.endDate ?? null);
  const [current, setCurrent] = useState(experience?.current ?? false);
  const [bullets, setBullets] = useState<string[]>(experience?.bullets ?? []);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmedCompany = company.trim();
    const trimmedRole = role.trim();

    if (!trimmedCompany) {
      setError('Company is required');
      return;
    }
    if (!trimmedRole) {
      setError('Role is required');
      return;
    }
    if (!startDate?.year) {
      setError('Start date is required');
      return;
    }
    if (!current && !endDate?.year) {
      setError('End date is required (or check "I currently work here")');
      return;
    }

    onSave({
      id: experience?.id ?? newExperience().id,
      company: trimmedCompany,
      role: trimmedRole,
      employmentType: employmentType === 'none' ? undefined : employmentType,
      location: location.trim() || undefined,
      startDate,
      endDate: current ? null : endDate,
      current,
      bullets,
    });
    onOpenChange(false);
  };

  return (
    <>
      <View className="mb-3 flex-row items-center justify-between">
        <SheetTitle>{experience ? 'Edit role' : 'Add role'}</SheetTitle>
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
            <Text className="font-sans-medium text-xs text-muted-foreground">COMPANY *</Text>
            <Input
              value={company}
              onChangeText={setCompany}
              placeholder="e.g. Stripe, Acme Corp"
              accessibilityLabel="Company"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">ROLE *</Text>
            <Input
              value={role}
              onChangeText={setRole}
              placeholder="e.g. Senior Frontend Engineer"
              accessibilityLabel="Role"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">EMPLOYMENT TYPE</Text>
            <Select
              value={employmentType}
              options={EMPLOYMENT_OPTIONS}
              onValueChange={(val) => setEmploymentType(val as EmploymentType | 'none')}
              aria-label="Employment type"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">LOCATION</Text>
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. San Francisco, CA or Remote"
              accessibilityLabel="Location"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">START DATE *</Text>
            <MonthYearPicker
              value={startDate}
              onChange={setStartDate}
              yearAccessibilityLabel="Start year"
            />
          </View>

          <Pressable
            onPress={() => setCurrent(!current)}
            className="flex-row items-center gap-2 pt-1 active:opacity-75">
            <Checkbox checked={current} onCheckedChange={setCurrent} />
            <Text className="text-sm text-foreground">I currently work here</Text>
          </Pressable>

          {!current ? (
            <View className="gap-1.5">
              <Text className="font-sans-medium text-xs text-muted-foreground">END DATE *</Text>
              <MonthYearPicker
                value={endDate}
                onChange={setEndDate}
                yearAccessibilityLabel="End year"
              />
            </View>
          ) : null}

          <View className="gap-1.5 pt-1">
            <Text className="font-sans-medium text-xs text-muted-foreground">ACHIEVEMENTS & BULLETS</Text>
            <BulletListEditor bullets={bullets} onChange={setBullets} />
          </View>

          <View className="flex-row items-center gap-2 pt-4">
            {onDelete && experience ? (
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
            <Button onPress={handleSave} accessibilityLabel="Save role" className="flex-1">
              Save
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

export function EditExperienceSheet({
  open,
  onOpenChange,
  experience,
  onSave,
  onDelete,
}: EditExperienceSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose>
        {open ? (
          <ExperienceForm
            key={experience?.id ?? 'new'}
            experience={experience}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onDelete={onDelete}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
