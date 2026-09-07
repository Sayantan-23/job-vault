import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Plus, Trash2, Pencil } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Fab } from '@/components/ui/fab';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { RouteProgress } from '@/components/ui/route-progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import {
  emptyProfileContent,
  formatMonthYearRange,
  newSkillGroup,
  validateProfileContent,
} from '@/lib/profile';
import type {
  ProfileContent,
  ProfileEducation,
  ProfileExperience,
  ProfileLink,
  ProfileProject,
} from '@/types/profile';

import { EditEducationSheet } from './edit-education-sheet';
import { EditExperienceSheet } from './edit-experience-sheet';
import { EditLinkSheet } from './edit-link-sheet';
import { EditProjectSheet } from './edit-project-sheet';
import { ProfileSection } from './profile-section';

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useProfile();
  const updateMutation = useUpdateProfile();

  const [draft, setDraft] = useState<ProfileContent>(() => data ?? emptyProfileContent());
  const [seeded, setSeeded] = useState(data);
  const [errors, setErrors] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newSkillText, setNewSkillText] = useState<{ [groupId: string]: string }>({});

  // Sub-item sheet states
  const [linkModal, setLinkModal] = useState<{
    open: boolean;
    link: ProfileLink | null;
    index: number | null;
  }>({ open: false, link: null, index: null });

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

  // Sync state when profile data arrives from cache or network
  if (data && data !== seeded) {
    setSeeded(data);
    setDraft(data);
  }

  const patch = (partial: Partial<ProfileContent>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const patchBasics = (partial: Partial<ProfileContent['basics']>) => {
    setDraft((prev) => ({ ...prev, basics: { ...prev.basics, ...partial } }));
  };

  const handleSave = () => {
    const foundErrors = validateProfileContent(draft);
    setErrors(foundErrors);
    if (foundErrors.length > 0) return;

    updateMutation.mutate(draft);
  };

  // Link actions
  const saveLink = (link: ProfileLink) => {
    const nextLinks = [...draft.basics.links];
    if (linkModal.index !== null && linkModal.index >= 0) {
      nextLinks[linkModal.index] = link;
    } else {
      nextLinks.push(link);
    }
    patchBasics({ links: nextLinks });
  };

  const deleteLink = (index: number) => {
    patchBasics({ links: draft.basics.links.filter((_, i) => i !== index) });
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
    const name = newCategoryName.trim();
    if (!name) return;
    const newGroup = { ...newSkillGroup(), category: name };
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

  if (isLoading && !data) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <RouteProgress />
        <View className="p-5 gap-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-4 h-48 w-full" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Top Header */}
      <View
        className="border-b border-border bg-card px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2 min-w-0 flex-1">
            <IconButton
              icon={ChevronLeft}
              accessibilityLabel="Back"
              onPress={() => router.back()}
            />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="font-serif text-2xl font-bold text-foreground">
                Profile
              </Text>
              <Text numberOfLines={1} className="text-xs text-muted-foreground">
                Your master career record
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
                : 'Failed to save profile'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Editor Body */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}>
        {/* 1. Basics */}
        <ProfileSection
          title="Basics"
          description="Your name, contact details, and online profiles.">
          <View className="gap-3">
            <View className="gap-1">
              <Text className="font-sans-medium text-xs text-muted-foreground">FULL NAME *</Text>
              <Input
                value={draft.basics.name}
                onChangeText={(val) => patchBasics({ name: val })}
                placeholder="e.g. Ada Lovelace"
                accessibilityLabel="Full name"
              />
            </View>

            <View className="gap-1">
              <Text className="font-sans-medium text-xs text-muted-foreground">EMAIL</Text>
              <Input
                value={draft.basics.email ?? ''}
                onChangeText={(val) => patchBasics({ email: val })}
                placeholder="e.g. ada@lovelace.dev"
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Email"
              />
            </View>

            <View className="gap-1">
              <Text className="font-sans-medium text-xs text-muted-foreground">PHONE</Text>
              <Input
                value={draft.basics.phone ?? ''}
                onChangeText={(val) => patchBasics({ phone: val })}
                placeholder="e.g. +1 555-0199"
                keyboardType="phone-pad"
                accessibilityLabel="Phone number"
              />
            </View>

            <View className="gap-1">
              <Text className="font-sans-medium text-xs text-muted-foreground">LOCATION</Text>
              <Input
                value={draft.basics.location ?? ''}
                onChangeText={(val) => patchBasics({ location: val })}
                placeholder="e.g. London, UK or Remote"
                accessibilityLabel="Location"
              />
            </View>

            {/* Links */}
            <View className="pt-2">
              <View className="flex-row items-center justify-between pb-2">
                <Text className="font-sans-medium text-xs text-muted-foreground">LINKS & WEBSITES</Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setLinkModal({ open: true, link: null, index: null })}>
                  <Icon icon={Plus} size={13} />
                  <Text className="text-xs">Add</Text>
                </Button>
              </View>

              {draft.basics.links.length === 0 ? (
                <Text className="text-xs text-muted-foreground italic py-1">No links added yet.</Text>
              ) : (
                <View className="gap-2">
                  {draft.basics.links.map((link, idx) => (
                    <View
                      key={link.id ?? idx}
                      className="flex-row items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-2.5">
                      <View className="min-w-0 flex-1 pr-2">
                        <Text className="font-sans-medium text-sm text-foreground">
                          {link.label}
                        </Text>
                        <Text numberOfLines={1} className="text-xs text-muted-foreground">
                          {link.url}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${link.label}`}
                          onPress={() => setLinkModal({ open: true, link, index: idx })}
                          className="rounded p-1.5 active:opacity-60">
                          <Icon icon={Pencil} size={14} className="text-muted-foreground" />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${link.label}`}
                          onPress={() => deleteLink(idx)}
                          className="rounded p-1.5 active:opacity-60">
                          <Icon icon={Trash2} size={14} className="text-muted-foreground" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ProfileSection>

        {/* 2. Summary */}
        <ProfileSection
          title="Summary"
          description="A short professional pitch shown at the top of a résumé.">
          <Textarea
            value={draft.summary}
            onChangeText={(val) => patch({ summary: val })}
            placeholder="A short summary of your focus, strengths, and goals…"
            numberOfLines={4}
            accessibilityLabel="Professional summary"
          />
        </ProfileSection>

        {/* 3. Experience */}
        <ProfileSection
          title="Experience"
          description="Roles you've held, most recent first."
          action={
            <Button
              variant="outline"
              size="sm"
              onPress={() => setExpModal({ open: true, item: null, index: null })}>
              <Icon icon={Plus} size={13} />
              <Text className="text-xs">Add</Text>
            </Button>
          }>
          {draft.experience.length === 0 ? (
            <Text className="text-xs text-muted-foreground italic py-2">No roles added yet.</Text>
          ) : (
            <View className="gap-2.5">
              {draft.experience.map((exp, idx) => (
                <Pressable
                  key={exp.id ?? idx}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit role ${exp.role} at ${exp.company}`}
                  onPress={() => setExpModal({ open: true, item: exp, index: idx })}
                  className="rounded-lg border border-border/80 bg-muted/20 p-3 active:opacity-75">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0 flex-1">
                      <Text className="font-sans-medium text-sm text-foreground">
                        {exp.role}
                      </Text>
                      <Text className="text-xs font-semibold text-muted-foreground">
                        {exp.company}
                        {exp.location ? ` · ${exp.location}` : ''}
                      </Text>
                      <Text className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatMonthYearRange(exp.startDate, exp.endDate, exp.current)}
                      </Text>
                    </View>
                    <Icon icon={Pencil} size={14} className="text-muted-foreground mt-0.5" />
                  </View>
                  {exp.bullets.length > 0 ? (
                    <Text className="mt-2 text-xs text-muted-foreground" numberOfLines={2}>
                      • {exp.bullets[0]}
                      {exp.bullets.length > 1 ? ` (+${exp.bullets.length - 1} more)` : ''}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </ProfileSection>

        {/* 4. Projects */}
        <ProfileSection
          title="Projects"
          description="Notable projects and open-source contributions."
          action={
            <Button
              variant="outline"
              size="sm"
              onPress={() => setProjModal({ open: true, item: null, index: null })}>
              <Icon icon={Plus} size={13} />
              <Text className="text-xs">Add</Text>
            </Button>
          }>
          {draft.projects.length === 0 ? (
            <Text className="text-xs text-muted-foreground italic py-2">No projects added yet.</Text>
          ) : (
            <View className="gap-2.5">
              {draft.projects.map((proj, idx) => (
                <Pressable
                  key={proj.id ?? idx}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit project ${proj.name}`}
                  onPress={() => setProjModal({ open: true, item: proj, index: idx })}
                  className="rounded-lg border border-border/80 bg-muted/20 p-3 active:opacity-75">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0 flex-1">
                      <Text className="font-sans-medium text-sm text-foreground">
                        {proj.name}
                      </Text>
                      {proj.role ? (
                        <Text className="text-xs text-muted-foreground">{proj.role}</Text>
                      ) : null}
                      {proj.description ? (
                        <Text numberOfLines={2} className="mt-1 text-xs text-muted-foreground">
                          {proj.description}
                        </Text>
                      ) : null}
                    </View>
                    <Icon icon={Pencil} size={14} className="text-muted-foreground mt-0.5" />
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
        </ProfileSection>

        {/* 5. Skills */}
        <ProfileSection
          title="Skills"
          description="Categories and skill tags for tailored matching."
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
          {addingCategory ? (
            <View className="mb-3 flex-row items-center gap-2 rounded-lg border border-border p-2.5">
              <View className="flex-1">
                <Input
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="e.g. Frontend, Databases, Languages"
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
            <Text className="text-xs text-muted-foreground italic py-2">
              No skill groups yet. Add a category to start grouping skills.
            </Text>
          ) : (
            <View className="gap-3">
              {draft.skills.map((group, gIdx) => {
                const groupId = group.id ?? `g-${gIdx}`;
                const draftText = newSkillText[groupId] ?? '';

                return (
                  <View
                    key={groupId}
                    className="rounded-lg border border-border/80 bg-muted/20 p-3">
                    <View className="flex-row items-center justify-between pb-2 border-b border-border/50">
                      <Text className="font-sans-medium text-xs text-foreground uppercase tracking-wide">
                        {group.category}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete category ${group.category}`}
                        onPress={() => removeCategory(gIdx)}
                        className="rounded p-1 active:opacity-60">
                        <Icon icon={Trash2} size={13} className="text-muted-foreground" />
                      </Pressable>
                    </View>

                    {/* Skill Badges */}
                    <View className="flex-row flex-wrap gap-1.5 py-2.5">
                      {group.items.length === 0 ? (
                        <Text className="text-xs text-muted-foreground italic">No items yet</Text>
                      ) : (
                        group.items.map((skill, sIdx) => (
                          <View
                            key={sIdx}
                            className="flex-row items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1">
                            <Text className="text-xs text-foreground">{skill}</Text>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Remove skill ${skill}`}
                              onPress={() => removeSkillFromGroup(gIdx, sIdx)}
                              className="rounded-full active:opacity-60">
                              <Text className="text-[11px] font-bold text-muted-foreground leading-none">
                                ×
                              </Text>
                            </Pressable>
                          </View>
                        ))
                      )}
                    </View>

                    {/* Add skill item inline */}
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
                        <Icon icon={Plus} size={14} />
                      </Button>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ProfileSection>

        {/* 6. Education */}
        <ProfileSection
          title="Education"
          description="Degrees, schools, and credentials."
          action={
            <Button
              variant="outline"
              size="sm"
              onPress={() => setEduModal({ open: true, item: null, index: null })}>
              <Icon icon={Plus} size={13} />
              <Text className="text-xs">Add</Text>
            </Button>
          }>
          {draft.education.length === 0 ? (
            <Text className="text-xs text-muted-foreground italic py-2">No education entries yet.</Text>
          ) : (
            <View className="gap-2.5">
              {draft.education.map((edu, idx) => (
                <Pressable
                  key={edu.id ?? idx}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit education ${edu.degree} at ${edu.institution}`}
                  onPress={() => setEduModal({ open: true, item: edu, index: idx })}
                  className="rounded-lg border border-border/80 bg-muted/20 p-3 active:opacity-75">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0 flex-1">
                      <Text className="font-sans-medium text-sm text-foreground">
                        {edu.degree}
                      </Text>
                      <Text className="text-xs font-semibold text-muted-foreground">
                        {edu.institution}
                        {edu.location ? ` · ${edu.location}` : ''}
                      </Text>
                      <Text className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatMonthYearRange(edu.startDate, edu.endDate, edu.current)}
                      </Text>
                    </View>
                    <Icon icon={Pencil} size={14} className="text-muted-foreground mt-0.5" />
                  </View>
                  {edu.grade ? (
                    <Text className="mt-1 text-xs text-muted-foreground">Grade: {edu.grade}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </ProfileSection>
      </ScrollView>

      {/* Sub-item Sheets */}
      <EditLinkSheet
        open={linkModal.open}
        onOpenChange={(open) => setLinkModal((prev) => ({ ...prev, open }))}
        link={linkModal.link}
        onSave={saveLink}
        onDelete={
          linkModal.index !== null ? () => deleteLink(linkModal.index as number) : undefined
        }
      />

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

      {/* Floating Action Button for Save Profile */}
      <Fab
        icon={Check}
        accessibilityLabel="Save profile"
        onPress={handleSave}
        disabled={isSaving || !draft.basics.name.trim()}
        loading={isSaving}
      />
    </View>
  );
}
