import { useState } from 'react';
import { Pressable } from 'react-native';
import { Text, View } from 'react-native-css/components';
import { useRouter } from 'expo-router';
import { Check, Sparkles, FileText } from 'lucide-react-native';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useCreatePersona } from '@/hooks/use-personas';
import { emptyProfileContent } from '@/lib/profile';
import type { ProfileContent } from '@/types/profile';
import type { Persona } from '@/types/persona';

export type CreatePersonaSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileContent;
  onCreated?: (persona: Persona) => void;
};

type CreationMode = 'profile' | 'blank';

export function CreatePersonaSheet({
  open,
  onOpenChange,
  profile,
  onCreated,
}: CreatePersonaSheetProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<CreationMode>('profile');
  const [validationError, setValidationError] = useState<string | null>(null);

  const createMutation = useCreatePersona();

  const reset = () => {
    setName('');
    setMode('profile');
    setValidationError(null);
    createMutation.reset();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      reset();
    }
  };

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setValidationError('Persona name is required');
      return;
    }

    setValidationError(null);

    const initialData: ProfileContent =
      mode === 'profile'
        ? {
            ...emptyProfileContent(),
            basics: {
              ...structuredClone(profile.basics),
              links: structuredClone(profile.basics.links),
            },
            summary: profile.summary,
          }
        : {
            ...emptyProfileContent(),
            basics: {
              ...emptyProfileContent().basics,
              name: profile.basics.name || 'User',
            },
          };

    createMutation.mutate(
      {
        name: trimmed,
        data: initialData,
      },
      {
        onSuccess: (newPersona) => {
          handleOpenChange(false);
          onCreated?.(newPersona);
          router.push(`/personas/${newPersona.id}` as any);
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent hideClose>
        <View className="gap-5 p-5">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <SheetTitle className="font-serif text-xl font-bold text-foreground">
              New Persona
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => handleOpenChange(false)}
              accessibilityLabel="Cancel">
              Cancel
            </Button>
          </View>

          {/* Validation or API Errors */}
          {validationError ? (
            <View className="rounded-lg bg-destructive/10 p-3">
              <Text className="text-xs text-destructive">{validationError}</Text>
            </View>
          ) : null}

          {createMutation.error ? (
            <View className="rounded-lg bg-destructive/10 p-3">
              <Text className="text-xs text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Failed to create persona'}
              </Text>
            </View>
          ) : null}

          {/* Persona Name */}
          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground uppercase tracking-wider">
              Persona Name *
            </Text>
            <Input
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. Frontend Engineer, Platform / Infra"
              accessibilityLabel="Persona name"
              autoFocus
            />
          </View>

          {/* Mode Selection */}
          <View className="gap-2">
            <Text className="font-sans-medium text-xs text-muted-foreground uppercase tracking-wider">
              Starting Content
            </Text>

            {/* Build from profile */}
            <Pressable
              onPress={() => setMode('profile')}
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === 'profile' }}
              accessibilityLabel="Build from profile"
              className={`rounded-lg border p-3.5 transition-colors active:opacity-75 ${
                mode === 'profile'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/20'
              }`}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-row items-start gap-3 min-w-0 flex-1">
                  <View className="rounded-md bg-primary/10 p-2 mt-0.5">
                    <Icon icon={Sparkles} size={16} className="text-primary" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-sans-medium text-sm text-foreground">
                      Build from profile
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      Pre-fills summary and contact basics from your master profile. Pick and tailor
                      roles later.
                    </Text>
                  </View>
                </View>
                {mode === 'profile' ? (
                  <View className="rounded-full bg-primary p-1">
                    <Icon icon={Check} size={12} className="text-primary-foreground" />
                  </View>
                ) : null}
              </View>
            </Pressable>

            {/* Blank slate */}
            <Pressable
              onPress={() => setMode('blank')}
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === 'blank' }}
              accessibilityLabel="Start blank"
              className={`rounded-lg border p-3.5 transition-colors active:opacity-75 ${
                mode === 'blank'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/20'
              }`}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-row items-start gap-3 min-w-0 flex-1">
                  <View className="rounded-md bg-muted p-2 mt-0.5">
                    <Icon icon={FileText} size={16} className="text-muted-foreground" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-sans-medium text-sm text-foreground">
                      Blank slate
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      Start fresh with an empty persona to tailor specifically from scratch.
                    </Text>
                  </View>
                </View>
                {mode === 'blank' ? (
                  <View className="rounded-full bg-primary p-1">
                    <Icon icon={Check} size={12} className="text-primary-foreground" />
                  </View>
                ) : null}
              </View>
            </Pressable>
          </View>

          {/* Action button */}
          <View className="pt-2">
            <Button
              onPress={handleCreate}
              disabled={createMutation.isPending}
              accessibilityLabel="Create persona">
              {createMutation.isPending ? 'Creating…' : 'Create Persona'}
            </Button>
          </View>
        </View>
      </SheetContent>
    </Sheet>
  );
}
