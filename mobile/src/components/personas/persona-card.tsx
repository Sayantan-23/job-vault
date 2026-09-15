import { Pressable, Text, View } from 'react-native-css/components';
import { Pencil, Trash2, UserRound } from 'lucide-react-native';

import { Icon } from '@/components/icon';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';
import { relativeTime } from '@/lib/relative-time';
import type { Persona } from '@/types/persona';

export type PersonaCardProps = {
  persona: Persona;
  onEdit: (persona: Persona) => void;
  onDelete: (persona: Persona) => void;
};

export function PersonaCard({ persona, onEdit, onDelete }: PersonaCardProps) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  const roles = persona.data?.experience?.length ?? 0;
  const projects = persona.data?.projects?.length ?? 0;
  const skillCount =
    persona.data?.skills?.reduce((acc, g) => acc + (g.items?.length ?? 0), 0) ?? 0;
  const summary = persona.data?.summary?.trim();

  // Extract first few skills to surface specializations directly on the card
  const topSkills: string[] = [];
  for (const group of persona.data?.skills ?? []) {
    for (const item of group.items ?? []) {
      if (topSkills.length < 4) {
        topSkills.push(item);
      }
    }
  }

  return (
    <Pressable
      onPress={() => onEdit(persona)}
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
      accessibilityRole="button"
      accessibilityLabel={`Persona ${persona.name}`}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5 active:scale-[0.99] active:opacity-90">
      {/* Header Row: Visual Anchor + Title + Actions all top-aligned */}
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-row items-start gap-3 min-w-0 flex-1">
          <View
            style={{ backgroundColor: colors.muted }}
            className="size-10 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
            <Icon icon={UserRound} size={18} color={colors.primary} className="text-primary" />
          </View>
          <View className="min-w-0 flex-1">
            <Text
              style={{ color: colors.foreground }}
              numberOfLines={1}
              className="font-serif text-[18px] leading-tight font-bold text-foreground">
              {persona.name}
            </Text>
            <Text
              style={{ color: colors.mutedForeground }}
              className="mt-1 text-[11px] text-muted-foreground">
              Updated {relativeTime(persona.updatedAt)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2 flex-shrink-0">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit persona ${persona.name}`}
            onPress={() => onEdit(persona)}
            hitSlop={8}
            style={{
              backgroundColor: colors.muted,
              borderColor: colors.border,
            }}
            className="size-9 items-center justify-center rounded-lg bg-secondary/80 border border-border/60 active:bg-secondary active:opacity-75">
            <Icon icon={Pencil} size={15} color={colors.foreground} className="text-foreground" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete persona ${persona.name}`}
            onPress={() => onDelete(persona)}
            hitSlop={8}
            className="size-9 items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20 active:bg-destructive/20 active:opacity-75">
            <Icon icon={Trash2} size={15} className="text-destructive" />
          </Pressable>
        </View>
      </View>

      {/* Summary Box */}
      <View
        style={{ backgroundColor: colors.muted, borderColor: colors.border }}
        className="mt-3.5 rounded-xl bg-secondary/40 p-3 border border-border/40">
        <Text
          style={{ color: colors.mutedForeground }}
          numberOfLines={2}
          className="text-xs text-muted-foreground leading-relaxed">
          {summary || 'No summary yet — edit this persona to tailor one.'}
        </Text>
      </View>

      {/* Metric Badges */}
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <Badge variant="secondary" className="px-2.5 py-1">
          {`${roles} ${roles === 1 ? 'role' : 'roles'}`}
        </Badge>
        <Badge variant="secondary" className="px-2.5 py-1">
          {`${projects} ${projects === 1 ? 'project' : 'projects'}`}
        </Badge>
        <Badge variant="secondary" className="px-2.5 py-1">
          {`${skillCount} skills`}
        </Badge>
      </View>

      {/* Skill Specialization Chips (if any) */}
      {topSkills.length > 0 ? (
        <View className="mt-2.5 flex-row flex-wrap items-center gap-1.5">
          {topSkills.map((skill, idx) => (
            <View
              key={idx}
              style={{ backgroundColor: colors.muted, borderColor: colors.border }}
              className="rounded-md bg-secondary/80 px-2 py-0.5 border border-border/50">
              <Text style={{ color: colors.mutedForeground }} className="text-[11px] text-muted-foreground">{skill}</Text>
            </View>
          ))}
          {skillCount > topSkills.length ? (
            <Text style={{ color: colors.mutedForeground }} className="text-[11px] text-muted-foreground ml-1">
              +{skillCount - topSkills.length} more
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
