import { useState, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Pencil, Plus, Trash2 } from 'lucide-react-native';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Fab } from '@/components/ui/fab';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RouteProgress } from '@/components/ui/route-progress';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ProfileSection } from '@/components/profile/profile-section';
import { EditExperienceSheet } from '@/components/profile/edit-experience-sheet';
import { EditProjectSheet } from '@/components/profile/edit-project-sheet';
import { EditEducationSheet } from '@/components/profile/edit-education-sheet';
import { usePersona, useUpdatePersona } from '@/hooks/use-personas';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';
import {
  emptyProfileContent,
  ensureProfileIds,
  formatMonthYearRange,
  newSkillGroup,
  reconcilePersonaWithProfile,
  validateProfileContent,
} from '@/lib/profile';
import type {
  ProfileContent,
  ProfileEducation,
  ProfileExperience,
  ProfileProject,
  ProfileSkillGroup,
} from '@/types/profile';
import { PersonaItemPicker } from './persona-item-picker';

export type PersonaEditorScreenProps = {
  id: string;
};

const idSet = (items: { id?: string }[]): Set<string> =>
  new Set(items.map((item) => item.id).filter((id): id is string => id !== undefined));

const removeByIds = <T extends { id?: string }>(items: T[], ids: string[]): T[] =>
  items.filter((item) => item.id === undefined || !ids.includes(item.id));

export function PersonaEditorScreen({ id }: PersonaEditorScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors = LIGHT_COLORS, effectiveTheme } = useTheme() ?? {};

  const { data: persona, isLoading: personaLoading } = usePersona(id);
  const { data: rawMasterProfile } = useProfile();
  const masterProfile = useMemo(
    () => ensureProfileIds(rawMasterProfile ?? emptyProfileContent()),
    [rawMasterProfile]
  );
  const updateMutation = useUpdatePersona(id);

  // Seeded state
  const [seededId, setSeededId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [initialName, setInitialName] = useState('');
  const [draft, setDraft] = useState<ProfileContent>(emptyProfileContent());
  const [initialDraft, setInitialDraft] = useState<ProfileContent | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Skills inline state
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSkillText, setNewSkillText] = useState<Record<string, string>>({});

  // Sub-item sheets
  const [expModal, setExpModal] = useState<{
    open: boolean;
    item: ProfileExperience | null;
    index: number | null;
  }>({ open: false, item: null, index: null });

  const [projModal, setProjModal] = useState<{
    open: boolean;
    item: ProfileProject | null;
    index: number | null;
  }>({ open: false, item: null, index: null });

  const [eduModal, setEduModal] = useState<{
    open: boolean;
    item: ProfileEducation | null;
    index: number | null;
  }>({ open: false, item: null, index: null });

  // Sync state when persona arrives
  if (persona && persona.id !== seededId) {
    setSeededId(persona.id);
    setName(persona.name);
    setInitialName(persona.name);
    const reconciled = reconcilePersonaWithProfile(
      persona.data ?? emptyProfileContent(),
      masterProfile
    );
    setDraft(reconciled);
    setInitialDraft(reconciled);
  }

  const patch = (partial: Partial<ProfileContent>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const isDirty = useMemo(() => {
    if (!persona || !initialDraft) return false;
    return initialName !== name || JSON.stringify(initialDraft) !== JSON.stringify(draft);
  }, [persona, initialName, name, initialDraft, draft]);

  const handleBack = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      router.back();
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrors(['Persona name is required']);
      return;
    }

    // Ensure basics name is present for validation
    const dataToValidate: ProfileContent = {
      ...draft,
      basics: {
        ...draft.basics,
        name: draft.basics.name.trim() || masterProfile.basics.name || 'User',
      },
    };

    const found = validateProfileContent(dataToValidate, { requireEducationDates: false });
    setErrors(found);
    if (found.length > 0) return;

    updateMutation.mutate({
      name: trimmedName,
      data: dataToValidate,
    });
  };

  // Experience actions
  const saveExperience = (item: ProfileExperience) => {
    const nextList = [...draft.experience];
    if (expModal.index !== null && expModal.index >= 0) {
      nextList[expModal.index] = item;
    } else {
      nextList.push(item);
    }
    patch({ experience: nextList });
  };

  const deleteExperience = (index: number) => {
    patch({ experience: draft.experience.filter((_, i) => i !== index) });
  };

  // Project actions
  const saveProject = (item: ProfileProject) => {
    const nextList = [...draft.projects];
    if (projModal.index !== null && projModal.index >= 0) {
      nextList[projModal.index] = item;
    } else {
      nextList.push(item);
    }
    patch({ projects: nextList });
  };

  const deleteProject = (index: number) => {
    patch({ projects: draft.projects.filter((_, i) => i !== index) });
  };

  // Education actions
  const saveEducation = (item: ProfileEducation) => {
    const nextList = [...draft.education];
    if (eduModal.index !== null && eduModal.index >= 0) {
      nextList[eduModal.index] = item;
    } else {
      nextList.push(item);
    }
    patch({ education: nextList });
  };

  const deleteEducation = (index: number) => {
    patch({ education: draft.education.filter((_, i) => i !== index) });
  };

  // Skills actions
  const addCategory = () => {
    const cat = newCategoryName.trim();
    if (!cat) return;
    const newGroup = { ...newSkillGroup(), category: cat };
    patch({ skills: [...draft.skills, newGroup] });
    setNewCategoryName('');
    setAddingCategory(false);
  };

  const removeCategory = (index: number) => {
    patch({ skills: draft.skills.filter((_, i) => i !== index) });
  };

  const addSkillToGroup = (groupId: string, index: number) => {
    const text = (newSkillText[groupId] ?? '').trim();
    if (!text) return;
    const nextSkills = [...draft.skills];
    const group = nextSkills[index];
    if (!group) return;
    nextSkills[index] = { ...group, items: [...group.items, text] };
    patch({ skills: nextSkills });
    setNewSkillText((prev) => ({ ...prev, [groupId]: '' }));
  };

  const removeSkillFromGroup = (groupIndex: number, skillIndex: number) => {
    const nextSkills = [...draft.skills];
    const group = nextSkills[groupIndex];
    if (!group) return;
    nextSkills[groupIndex] = {
      ...group,
      items: group.items.filter((_, i) => i !== skillIndex),
    };
    patch({ skills: nextSkills });
  };

  const isSaving = updateMutation.isPending;
  const isSaved = updateMutation.isSuccess && !updateMutation.isPending;

  if (personaLoading && !persona) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <RouteProgress />
        <View className="p-4 gap-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-4 h-48 w-full" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.background }} className="flex-1 bg-background">
      {/* Top Header */}
      <View
        className="border-b border-border bg-card px-4 pb-3"
        style={{
          paddingTop: insets.top + 8,
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        }}>
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2 min-w-0 flex-1">
            <IconButton
              icon={ChevronLeft}
              accessibilityLabel="Back"
              onPress={handleBack}
            />
            <View className="min-w-0 flex-1">
              <Text
                style={{ color: colors.foreground }}
                numberOfLines={1}
                className="font-serif text-2xl font-bold text-foreground">
                Edit Persona
              </Text>
              <Text
                style={{ color: colors.mutedForeground }}
                numberOfLines={1}
                className="text-xs text-muted-foreground">
                {name || 'Tailored career background'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            {isSaved ? (
              <View className="rounded-full bg-secondary/80 px-2.5 py-1 border border-border/60">
                <Text className="text-xs font-sans-medium text-muted-foreground">Saved</Text>
              </View>
            ) : null}
          </View>
        </View>

        {errors.length > 0 ? (
          <View className="mt-3 rounded-lg bg-destructive/10 p-3">
            <Text className="text-xs font-semibold text-destructive mb-1">
              Please fix the following:
            </Text>
            {errors.map((err, i) => (
              <Text key={i} className="text-xs text-destructive">
                • {err}
              </Text>
            ))}
          </View>
        ) : null}

        {updateMutation.error ? (
          <View className="mt-3 rounded-lg bg-destructive/10 p-3">
            <Text className="text-xs text-destructive">
              {updateMutation.error instanceof Error
                ? updateMutation.error.message
                : 'Failed to update persona'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Editor Body */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 96,
        }}
        showsVerticalScrollIndicator={false}>
        {/* Persona Name */}
        <View className="mb-4 rounded-xl border border-border bg-card p-4 gap-2">
          <Text className="font-sans-medium text-xs text-muted-foreground uppercase tracking-wider">
            PERSONA NAME *
          </Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="e.g. Senior Frontend Engineer"
            accessibilityLabel="Persona name"
          />
        </View>

        {/* 1. Summary */}
        <ProfileSection
          title="Summary"
          description="A tailored pitch highlighting relevant strengths for this persona.">
          <Textarea
            value={draft.summary}
            onChangeText={(val) => patch({ summary: val })}
            placeholder="A short summary of your focus and strengths for this role…"
            numberOfLines={4}
            accessibilityLabel="Professional summary"
          />
        </ProfileSection>

        {/* 2. Experience */}
        <ProfileSection
          title="Experience"
          description="Pick roles from your profile, or tailor custom entries."
          action={
            <Button
              variant="outline"
              size="sm"
              onPress={() => setExpModal({ open: true, item: null, index: null })}>
              <Icon icon={Plus} size={13} />
              <Text className="text-xs">Add</Text>
            </Button>
          }>
          <View className="gap-3">
            {/* Master Profile Picker */}
            <PersonaItemPicker<ProfileExperience>
              label="Profile experience picker"
              profileItems={masterProfile.experience}
              selectedIds={idSet(draft.experience)}
              getTitle={(e) => `${e.role} @ ${e.company}`}
              getSubtitle={(e) => formatMonthYearRange(e.startDate, e.endDate, e.current)}
              onAdd={(items) => patch({ experience: [...draft.experience, ...items] })}
              onRemove={(ids) => patch({ experience: removeByIds(draft.experience, ids) })}
              emptyHint="No experience in your profile yet — add it on your Profile page."
            />

            {/* Persona Tailored Roles */}
            {draft.experience.length === 0 ? (
              <Text style={{ color: colors.mutedForeground }} className="text-xs text-muted-foreground italic py-2">
                No roles in this persona. Pick roles from above or tap Add.
              </Text>
            ) : (
              <View className="gap-2.5">
                {draft.experience.map((exp, idx) => (
                  <Pressable
                    key={exp.id ?? idx}
                    style={{
                      backgroundColor: effectiveTheme === 'dark' ? '#181614' : '#f5f3ef',
                      borderColor: colors.border,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit role ${exp.role} at ${exp.company}`}
                    onPress={() => setExpModal({ open: true, item: exp, index: idx })}
                    className="rounded-lg border border-border/80 bg-muted/20 p-3 active:opacity-75">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="min-w-0 flex-1">
                        <Text
                          style={{ color: colors.foreground }}
                          className="font-sans-medium text-sm text-foreground">
                          {exp.role}
                        </Text>
                        <Text
                          style={{ color: colors.mutedForeground }}
                          className="text-xs font-semibold text-muted-foreground">
                          {exp.company}
                          {exp.location ? ` · ${exp.location}` : ''}
                        </Text>
                        <Text
                          style={{ color: colors.mutedForeground }}
                          className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatMonthYearRange(exp.startDate, exp.endDate, exp.current)}
                        </Text>
                      </View>
                      <Icon icon={Pencil} size={14} color={colors.mutedForeground} className="text-muted-foreground mt-0.5" />
                    </View>
                    {exp.bullets.length > 0 ? (
                      <Text
                        style={{ color: colors.mutedForeground }}
                        className="mt-2 text-xs text-muted-foreground"
                        numberOfLines={2}>
                        • {exp.bullets[0]}
                        {exp.bullets.length > 1 ? ` (+${exp.bullets.length - 1} more)` : ''}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ProfileSection>

        {/* 3. Projects */}
        <ProfileSection
          title="Projects"
          description="Pick projects from your profile, or tailor custom entries."
          action={
            <Button
              variant="outline"
              size="sm"
              onPress={() => setProjModal({ open: true, item: null, index: null })}>
              <Icon icon={Plus} size={13} color={colors.foreground} />
              <Text className="text-xs">Add</Text>
            </Button>
          }>
          <View className="gap-3">
            {/* Master Profile Picker */}
            <PersonaItemPicker<ProfileProject>
              label="Profile projects picker"
              profileItems={masterProfile.projects}
              selectedIds={idSet(draft.projects)}
              getTitle={(p) => p.name}
              getSubtitle={(p) => p.description ?? ''}
              onAdd={(items) => patch({ projects: [...draft.projects, ...items] })}
              onRemove={(ids) => patch({ projects: removeByIds(draft.projects, ids) })}
              emptyHint="No projects in your profile yet — add them on your Profile page."
            />

            {/* Persona Tailored Projects */}
            {draft.projects.length === 0 ? (
              <Text style={{ color: colors.mutedForeground }} className="text-xs text-muted-foreground italic py-2">
                No projects in this persona. Pick projects from above or tap Add.
              </Text>
            ) : (
              <View className="gap-2.5">
                {draft.projects.map((proj, idx) => (
                  <Pressable
                    key={proj.id ?? idx}
                    style={{
                      backgroundColor: effectiveTheme === 'dark' ? '#181614' : '#f5f3ef',
                      borderColor: colors.border,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit project ${proj.name}`}
                    onPress={() => setProjModal({ open: true, item: proj, index: idx })}
                    className="rounded-lg border border-border/80 bg-muted/20 p-3 active:opacity-75">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="min-w-0 flex-1">
                        <Text
                          style={{ color: colors.foreground }}
                          className="font-sans-medium text-sm text-foreground">
                          {proj.name}
                        </Text>
                        {proj.role ? (
                          <Text
                            style={{ color: colors.mutedForeground }}
                            className="text-xs text-muted-foreground">
                            {proj.role}
                          </Text>
                        ) : null}
                        {proj.description ? (
                          <Text
                            style={{ color: colors.mutedForeground }}
                            numberOfLines={2}
                            className="mt-1 text-xs text-muted-foreground">
                            {proj.description}
                          </Text>
                        ) : null}
                      </View>
                      <Icon icon={Pencil} size={14} color={colors.mutedForeground} className="text-muted-foreground mt-0.5" />
                    </View>
                    {proj.technologies && proj.technologies.length > 0 ? (
                      <View className="mt-2 flex-row flex-wrap gap-1">
                        {proj.technologies.map((t, ti) => (
                          <Badge key={ti} variant="secondary" className="px-1.5 py-0.5 text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ProfileSection>

        {/* 4. Skills */}
        <ProfileSection
          title="Skills"
          description="Pick skill groups from your profile, or tailor custom categories."
          action={
            !addingCategory ? (
              <Button
                variant="outline"
                size="sm"
                onPress={() => setAddingCategory(true)}>
                <Icon icon={Plus} size={13} />
                <Text className="text-xs">Add</Text>
              </Button>
            ) : null
          }>
          <View className="gap-3">
            {/* Master Profile Picker */}
            <PersonaItemPicker<ProfileSkillGroup>
              label="Profile skills picker"
              profileItems={masterProfile.skills}
              selectedIds={idSet(draft.skills)}
              getTitle={(g) => g.category}
              getSubtitle={(g) =>
                `${g.items.length} ${g.items.length === 1 ? 'skill' : 'skills'}`
              }
              onAdd={(items) => patch({ skills: [...draft.skills, ...items] })}
              onRemove={(ids) => patch({ skills: removeByIds(draft.skills, ids) })}
              emptyHint="No skills in your profile yet — add them on your Profile page."
            />

            {addingCategory ? (
              <View className="flex-row items-center gap-2 rounded-lg border border-border p-2.5">
                <View className="flex-1">
                  <Input
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    placeholder="e.g. Frontend, Mobile"
                    accessibilityLabel="Category name"
                  />
                </View>
                <Button size="sm" onPress={addCategory} disabled={!newCategoryName.trim()}>
                  Add
                </Button>
                <Button variant="ghost" size="sm" onPress={() => setAddingCategory(false)}>
                  Cancel
                </Button>
              </View>
            ) : null}

            {draft.skills.length === 0 ? (
              <Text style={{ color: colors.mutedForeground }} className="text-xs text-muted-foreground italic py-2">
                No skill groups in this persona. Pick groups from above or tap Add.
              </Text>
            ) : (
              <View className="gap-3">
                {draft.skills.map((group, gIdx) => {
                  const groupId = group.id ?? `g-${gIdx}`;
                  const draftText = newSkillText[groupId] ?? '';

                  return (
                    <View
                      key={groupId}
                      style={{
                        backgroundColor: effectiveTheme === 'dark' ? '#181614' : '#f5f3ef',
                        borderColor: colors.border,
                      }}
                      className="rounded-lg border border-border/80 bg-muted/20 p-3">
                      <View
                        style={{ borderBottomColor: colors.border }}
                        className="flex-row items-center justify-between pb-2 border-b border-border/50">
                        <Text
                          style={{ color: colors.foreground }}
                          className="font-sans-medium text-xs text-foreground uppercase tracking-wide">
                          {group.category}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Delete category ${group.category}`}
                          onPress={() => removeCategory(gIdx)}
                          className="rounded p-1 active:opacity-60">
                          <Icon icon={Trash2} size={13} color={colors.mutedForeground} className="text-muted-foreground" />
                        </Pressable>
                      </View>

                      {/* Skill Badges */}
                      <View className="flex-row flex-wrap gap-1.5 py-2.5">
                        {group.items.length === 0 ? (
                          <Text style={{ color: colors.mutedForeground }} className="text-xs text-muted-foreground italic">No items yet</Text>
                        ) : (
                          group.items.map((skill, sIdx) => (
                            <View
                              key={sIdx}
                              style={{
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                              }}
                              className="flex-row items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1">
                              <Text style={{ color: colors.foreground }} className="text-xs text-foreground">{skill}</Text>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Remove skill ${skill}`}
                                onPress={() => removeSkillFromGroup(gIdx, sIdx)}
                                className="rounded-full active:opacity-60">
                                <Text style={{ color: colors.mutedForeground }} className="text-[11px] font-bold text-muted-foreground leading-none">
                                  ×
                                </Text>
                              </Pressable>
                            </View>
                          ))
                        )}
                      </View>

                      {/* Add skill inline */}
                      <View className="flex-row items-center gap-2 pt-1">
                        <View className="flex-1">
                          <Input
                            value={draftText}
                            onChangeText={(val) =>
                              setNewSkillText((prev) => ({ ...prev, [groupId]: val }))
                            }
                            placeholder={`Add to ${group.category}…`}
                            onSubmitEditing={() => addSkillToGroup(groupId, gIdx)}
                            returnKeyType="done"
                            accessibilityLabel={`New skill for ${group.category}`}
                          />
                        </View>
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => addSkillToGroup(groupId, gIdx)}
                          disabled={!draftText.trim()}>
                          <Icon icon={Plus} size={14} color={colors.foreground} />
                        </Button>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ProfileSection>

        {/* 5. Education */}
        <ProfileSection
          title="Education"
          description="Pick credentials from your master profile to highlight."
          action={
            <Button
              variant="outline"
              size="sm"
              onPress={() => setEduModal({ open: true, item: null, index: null })}>
              <Icon icon={Plus} size={13} color={colors.foreground} />
              <Text className="text-xs">Add</Text>
            </Button>
          }>
          <View className="gap-3">
            {/* Master Profile Picker */}
            <PersonaItemPicker<ProfileEducation>
              label="Profile education picker"
              profileItems={masterProfile.education}
              selectedIds={idSet(draft.education)}
              getTitle={(edu) => `${edu.degree} @ ${edu.institution}`}
              getSubtitle={(edu) => formatMonthYearRange(edu.startDate, edu.endDate, edu.current)}
              onAdd={(items) => patch({ education: [...draft.education, ...items] })}
              onRemove={(ids) => patch({ education: removeByIds(draft.education, ids) })}
              emptyHint="No education in your profile yet — add it on your Profile page."
            />

            {/* Persona Tailored Education */}
            {draft.education.length === 0 ? (
              <Text style={{ color: colors.mutedForeground }} className="text-xs text-muted-foreground italic py-2">
                No education entries in this persona.
              </Text>
            ) : (
              <View className="gap-2.5">
                {draft.education.map((edu, idx) => (
                  <Pressable
                    key={edu.id ?? idx}
                    style={{
                      backgroundColor: effectiveTheme === 'dark' ? '#181614' : '#f5f3ef',
                      borderColor: colors.border,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit education ${edu.degree} at ${edu.institution}`}
                    onPress={() => setEduModal({ open: true, item: edu, index: idx })}
                    className="rounded-lg border border-border/80 bg-muted/20 p-3 active:opacity-75">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="min-w-0 flex-1">
                        <Text
                          style={{ color: colors.foreground }}
                          className="font-sans-medium text-sm text-foreground">
                          {edu.degree}
                        </Text>
                        <Text
                          style={{ color: colors.mutedForeground }}
                          className="text-xs font-semibold text-muted-foreground">
                          {edu.institution}
                          {edu.location ? ` · ${edu.location}` : ''}
                        </Text>
                        <Text
                          style={{ color: colors.mutedForeground }}
                          className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatMonthYearRange(edu.startDate, edu.endDate, edu.current)}
                        </Text>
                      </View>
                      <Icon icon={Pencil} size={14} color={colors.mutedForeground} className="text-muted-foreground mt-0.5" />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ProfileSection>
      </ScrollView>

      {/* Sub-item Sheets */}
      <EditExperienceSheet
        open={expModal.open}
        onOpenChange={(open) => setExpModal((prev) => ({ ...prev, open }))}
        experience={expModal.item}
        onSave={saveExperience}
        onDelete={
          expModal.index !== null ? () => deleteExperience(expModal.index as number) : undefined
        }
      />

      <EditProjectSheet
        open={projModal.open}
        onOpenChange={(open) => setProjModal((prev) => ({ ...prev, open }))}
        project={projModal.item}
        onSave={saveProject}
        onDelete={
          projModal.index !== null ? () => deleteProject(projModal.index as number) : undefined
        }
      />

      <EditEducationSheet
        open={eduModal.open}
        onOpenChange={(open) => setEduModal((prev) => ({ ...prev, open }))}
        education={eduModal.item}
        onSave={saveEducation}
        onDelete={
          eduModal.index !== null ? () => deleteEducation(eduModal.index as number) : undefined
        }
      />

      {/* Discard Changes Dialog */}
      <ConfirmDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title="Discard unsaved changes?"
        description="You have unsaved edits in this persona that will be lost."
        confirmLabel="Discard"
        destructive={true}
        onConfirm={() => {
          setShowExitConfirm(false);
          router.back();
        }}
      />

      {/* Floating Action Button for Save Persona */}
      <Fab
        icon={Check}
        accessibilityLabel="Save persona"
        onPress={handleSave}
        disabled={isSaving || !name.trim()}
        loading={isSaving}
      />
    </View>
  );
}
