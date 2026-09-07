import { useState } from 'react';
import { RefreshControl } from 'react-native';
import { ScrollView, Text, View } from 'react-native-css/components';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Sparkles } from 'lucide-react-native';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Fab } from '@/components/ui/fab';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RouteProgress } from '@/components/ui/route-progress';
import { usePersonas, useDeletePersona } from '@/hooks/use-personas';
import { useProfile } from '@/hooks/use-profile';
import { emptyProfileContent } from '@/lib/profile';
import type { Persona } from '@/types/persona';
import { PersonaCard } from './persona-card';
import { CreatePersonaSheet } from './create-persona-sheet';

const MAX_PERSONAS = 5;

export function PersonasWorkspace() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [createOpen, setCreateOpen] = useState(false);
  const [personaToDelete, setPersonaToDelete] = useState<Persona | null>(null);

  const { data: personas = [], isLoading, isRefetching, refetch, error } = usePersonas();
  const { data: profileData } = useProfile();
  const deleteMutation = useDeletePersona();

  const atCap = personas.length >= MAX_PERSONAS;

  const handleEdit = (persona: Persona) => {
    router.push(`/personas/${persona.id}` as any);
  };

  const handleDeleteConfirm = () => {
    if (!personaToDelete) return;
    deleteMutation.mutate(personaToDelete.id);
    setPersonaToDelete(null);
  };

  if (isLoading && personas.length === 0) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <RouteProgress />
        <View className="p-4 gap-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-4 h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Top Header */}
      <View
        className="border-b border-border bg-card px-4 pb-3.5"
        style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2.5 min-w-0 flex-1">
            <IconButton
              icon={ChevronLeft}
              accessibilityLabel="Back"
              onPress={() => router.back()}
            />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="font-serif text-2xl font-bold text-foreground">
                Personas
              </Text>
              <View className="flex-row items-center gap-2 mt-0.5">
                <View className="rounded-full bg-secondary px-2 py-0.5 border border-border/60">
                  <Text className="font-mono text-[11px] text-muted-foreground font-medium">
                    {`${personas.length} / ${MAX_PERSONAS}`}
                  </Text>
                </View>
                <Text numberOfLines={1} className="text-xs text-muted-foreground">
                  role-focused backgrounds
                </Text>
              </View>
            </View>
          </View>
        </View>

        {atCap ? (
          <View className="mt-3 rounded-xl bg-muted/60 p-3 border border-border flex-row items-center gap-2.5">
            <Icon icon={Sparkles} size={15} className="text-muted-foreground flex-shrink-0" />
            <Text className="text-xs text-muted-foreground flex-1 leading-snug">
              You’ve reached the maximum of {MAX_PERSONAS} personas. Delete one to add another.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="mt-2.5 rounded-lg bg-destructive/10 p-2.5">
            <Text className="text-xs text-destructive">
              {error instanceof Error ? error.message : 'Failed to load personas'}
            </Text>
          </View>
        ) : null}

        {deleteMutation.error ? (
          <View className="mt-2.5 rounded-lg bg-destructive/10 p-2.5">
            <Text className="text-xs text-destructive">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : 'Failed to delete persona'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Body / List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 80,
        }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        showsVerticalScrollIndicator={false}>
        {personas.length === 0 ? (
          <EmptyState
            title="No personas yet"
            description="Create a persona to start generating tailored résumés and cover letters."
            action={
              <Button
                icon={Plus}
                onPress={() => setCreateOpen(true)}
                accessibilityLabel="Create persona">
                Create persona
              </Button>
            }
          />
        ) : (
          <View className="gap-5">
            {personas.map((persona, index) => (
              <View key={persona.id} className="gap-5">
                {index > 0 ? (
                  <View className="flex-row items-center gap-3 px-3 my-0.5">
                    <View className="h-px flex-1 bg-border" />
                    <View className="size-1 rounded-full bg-muted-foreground/40" />
                    <View className="h-px flex-1 bg-border" />
                  </View>
                ) : null}
                <PersonaCard
                  persona={persona}
                  onEdit={handleEdit}
                  onDelete={setPersonaToDelete}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={personaToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPersonaToDelete(null);
        }}
        title="Delete persona?"
        description={
          personaToDelete
            ? `"${personaToDelete.name}" will be permanently deleted. Résumés and cover letters already generated from it are not affected.`
            : ''
        }
        confirmLabel="Delete"
        destructive={true}
        onConfirm={handleDeleteConfirm}
      />

      {/* Create Persona Sheet */}
      <CreatePersonaSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        profile={profileData ?? emptyProfileContent()}
      />

      {/* Floating Action Button for New Persona */}
      <Fab
        icon={Plus}
        accessibilityLabel="New persona"
        onPress={() => setCreateOpen(true)}
        disabled={atCap}
      />
    </View>
  );
}
