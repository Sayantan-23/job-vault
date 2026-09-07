import { useState } from 'react';
import { X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { newEducation } from '@/lib/profile';
import type { MonthYear, ProfileEducation } from '@/types/profile';

import { BulletListEditor } from './bullet-list-editor';
import { MonthYearPicker } from './month-year-picker';

export interface EditEducationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  education: ProfileEducation | null;
  onSave: (item: ProfileEducation) => void;
  onDelete?: () => void;
}

function EducationForm({
  education,
  onOpenChange,
  onSave,
  onDelete,
}: Omit<EditEducationSheetProps, 'open'>) {
  const [degree, setDegree] = useState(education?.degree ?? '');
  const [institution, setInstitution] = useState(education?.institution ?? '');
  const [fieldOfStudy, setFieldOfStudy] = useState(education?.fieldOfStudy ?? '');
  const [location, setLocation] = useState(education?.location ?? '');
  const [startDate, setStartDate] = useState<MonthYear | null>(education?.startDate ?? null);
  const [endDate, setEndDate] = useState<MonthYear | null>(education?.endDate ?? null);
  const [current, setCurrent] = useState(education?.current ?? false);
  const [grade, setGrade] = useState(education?.grade ?? '');
  const [bullets, setBullets] = useState<string[]>(education?.bullets ?? []);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmedDegree = degree.trim();
    const trimmedInstitution = institution.trim();

    if (!trimmedDegree) {
      setError('Degree is required (e.g. B.S., M.S., High School)');
      return;
    }
    if (!trimmedInstitution) {
      setError('Institution is required');
      return;
    }
    if (!startDate?.year) {
      setError('Start date is required');
      return;
    }
    if (!current && !endDate?.year) {
      setError('End date is required (or check "Currently studying here")');
      return;
    }

    onSave({
      id: education?.id ?? newEducation().id,
      degree: trimmedDegree,
      institution: trimmedInstitution,
      fieldOfStudy: fieldOfStudy.trim() || undefined,
      location: location.trim() || undefined,
      startDate,
      endDate: current ? null : endDate,
      current,
      grade: grade.trim() || undefined,
      bullets,
    });
    onOpenChange(false);
  };

  return (
    <>
      <View className="mb-3 flex-row items-center justify-between">
        <SheetTitle>{education ? 'Edit education' : 'Add education'}</SheetTitle>
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
            <Text className="font-sans-medium text-xs text-muted-foreground">DEGREE *</Text>
            <Input
              value={degree}
              onChangeText={setDegree}
              placeholder="e.g. B.S. Computer Science"
              accessibilityLabel="Degree"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">INSTITUTION *</Text>
            <Input
              value={institution}
              onChangeText={setInstitution}
              placeholder="e.g. University of California, Berkeley"
              accessibilityLabel="Institution"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">FIELD OF STUDY</Text>
            <Input
              value={fieldOfStudy}
              onChangeText={setFieldOfStudy}
              placeholder="e.g. Software Engineering"
              accessibilityLabel="Field of study"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">LOCATION</Text>
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Berkeley, CA"
              accessibilityLabel="Location"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">START DATE *</Text>
            <MonthYearPicker value={startDate} onChange={setStartDate} />
          </View>

          <Pressable
            onPress={() => setCurrent(!current)}
            className="flex-row items-center gap-2 pt-1 active:opacity-75">
            <Checkbox checked={current} onCheckedChange={setCurrent} />
            <Text className="text-sm text-foreground">Currently studying here</Text>
          </Pressable>

          {!current ? (
            <View className="gap-1.5">
              <Text className="font-sans-medium text-xs text-muted-foreground">END DATE *</Text>
              <MonthYearPicker value={endDate} onChange={setEndDate} />
            </View>
          ) : null}

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">GRADE / GPA</Text>
            <Input
              value={grade}
              onChangeText={setGrade}
              placeholder="e.g. 3.8 / 4.0"
              accessibilityLabel="Grade or GPA"
            />
          </View>

          <View className="gap-1.5 pt-1">
            <Text className="font-sans-medium text-xs text-muted-foreground">ACTIVITIES & HONORS</Text>
            <BulletListEditor bullets={bullets} onChange={setBullets} />
          </View>

          <View className="flex-row items-center gap-2 pt-4">
            {onDelete && education ? (
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

export function EditEducationSheet({
  open,
  onOpenChange,
  education,
  onSave,
  onDelete,
}: EditEducationSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose>
        {open ? (
          <EducationForm
            key={education?.id ?? 'new'}
            education={education}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onDelete={onDelete}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
