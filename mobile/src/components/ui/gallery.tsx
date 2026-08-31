import { useState } from 'react';
import { Bell, LayoutGrid, List, Search } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native-css/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AnchoredPopover,
  AnchoredPopoverClose,
  AnchoredPopoverContent,
  AnchoredPopoverTrigger,
} from './anchored-popover';
import { MonogramAvatar } from './avatar';
import { Button, type ButtonVariant } from './button';
import { Checkbox } from './checkbox';
import { ConfirmDialog } from './confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { IconButton } from './icon-button';
import { Input } from './input';
import { Label } from './label';
import { RouteProgress } from './route-progress';
import { SegmentedControl } from './segmented-control';
import { Select } from './select';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet';
import { Skeleton } from './skeleton';
import { Textarea } from './textarea';

const VARIANTS: ButtonVariant[] = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'softPrimary',
  'softDestructive',
  'link',
];

const VIEW_OPTIONS = [
  { value: 'board', label: 'Board', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: List },
] as const;

const STATUS_OPTIONS = [
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3 border-b border-hairline px-5 py-6">
      <Text className="font-mono text-[11px] uppercase text-muted-foreground">{title}</Text>
      {children}
    </View>
  );
}

/**
 * Kitchen sink for the C2 primitives — every one of them on screen at once, so a
 * device pass can tell "rendered" from "compiled". Not part of the product
 * surface; it hangs off /gallery and nothing links to it.
 */
export function Gallery() {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(true);
  const [view, setView] = useState<'board' | 'list'>('list');
  const [status, setStatus] = useState<'saved' | 'applied' | 'interview' | 'offer'>('applied');
  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View className="px-5 pb-2 pt-4">
          <Text className="font-serif text-[30px] leading-[34px] text-foreground">Primitives</Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            C2 — every primitive on our tokens.
          </Text>
        </View>

        <Section title="Button">
          <View className="flex-row flex-wrap gap-2">
            {VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} size="sm">
                {variant}
              </Button>
            ))}
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </View>
        </Section>

        <Section title="IconButton">
          <View className="flex-row items-center gap-2">
            <IconButton icon={Search} accessibilityLabel="Search" />
            <IconButton icon={Bell} accessibilityLabel="Notifications" />
            <IconButton icon={Bell} accessibilityLabel="Disabled" disabled />
          </View>
        </Section>

        <Section title="Label · Input · Textarea">
          <Label>Email</Label>
          <Input placeholder="you@example.com" value={text} onChangeText={setText} />
          <Label>Notes</Label>
          <Textarea placeholder="Anything worth remembering…" value={notes} onChangeText={setNotes} />
        </Section>

        <Section title="Checkbox">
          <View className="flex-row items-center gap-3">
            <Checkbox aria-label="Remember me" checked={checked} onCheckedChange={setChecked} />
            <Text className="text-sm text-foreground">Remember me</Text>
          </View>
        </Section>

        <Section title="Select">
          <Select
            value={status}
            onValueChange={setStatus}
            options={STATUS_OPTIONS}
            aria-label="Status"
          />
        </Section>

        <Section title="SegmentedControl">
          <SegmentedControl
            value={view}
            onValueChange={setView}
            options={VIEW_OPTIONS}
            aria-label="View"
          />
        </Section>

        <Section title="MonogramAvatar">
          <View className="flex-row items-center gap-2">
            {['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson', ' '].map(
              (name) => (
                <MonogramAvatar key={name} name={name} />
              )
            )}
          </View>
        </Section>

        <Section title="Skeleton">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Section>

        <Section title="RouteProgress">
          <View className="h-6 justify-start overflow-hidden rounded-md bg-muted">
            <RouteProgress />
          </View>
        </Section>

        <Section title="AnchoredPopover">
          <AnchoredPopover>
            <AnchoredPopoverTrigger
              accessibilityLabel="Account"
              className="self-start rounded-full">
              <MonogramAvatar name="Sayantan" />
            </AnchoredPopoverTrigger>
            <AnchoredPopoverContent>
              <AnchoredPopoverClose className="rounded-md px-3 py-2.5">
                <Text className="text-sm text-card-foreground">Profile</Text>
              </AnchoredPopoverClose>
              <AnchoredPopoverClose className="rounded-md px-3 py-2.5">
                <Text className="text-sm text-card-foreground">Settings</Text>
              </AnchoredPopoverClose>
              <AnchoredPopoverClose className="rounded-md px-3 py-2.5">
                <Text className="text-sm text-destructive">Sign out</Text>
              </AnchoredPopoverClose>
            </AnchoredPopoverContent>
          </AnchoredPopover>
        </Section>

        <Section title="Dialog · ConfirmDialog · Sheet">
          <View className="flex-row flex-wrap gap-2">
            <Button size="sm" variant="outline" onPress={() => setDialogOpen(true)}>
              Dialog
            </Button>
            <Button size="sm" variant="softDestructive" onPress={() => setConfirmOpen(true)}>
              Confirm
            </Button>
            <Button size="sm" variant="outline" onPress={() => setSheetOpen(true)}>
              Sheet
            </Button>
          </View>
        </Section>

        <Section title="MarkdownProse">
          <Text className="text-sm text-muted-foreground">
            Not built — needs react-native-markdown-display. Only repairSplitBold ported.
          </Text>
        </Section>
      </ScrollView>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>Rename résumé</DialogTitle>
          <DialogDescription>Give this résumé a name you will recognise later.</DialogDescription>
          <Input placeholder="Backend — 2026" />
          <View className="flex-row justify-end gap-2">
            <Button size="sm" variant="outline" onPress={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onPress={() => setDialogOpen(false)}>
              Save
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => setConfirmOpen(false)}
        title="Delete this résumé?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetTitle>Outreach</SheetTitle>
          <SheetDescription>Referral contacts attached to this application.</SheetDescription>
          <View className="mt-4 gap-3">
            {['Priya Raman', 'Devon Clarke'].map((name) => (
              <View key={name} className="flex-row items-center gap-3">
                <MonogramAvatar name={name} />
                <Text className="text-sm text-card-foreground">{name}</Text>
              </View>
            ))}
          </View>
        </SheetContent>
      </Sheet>
    </View>
  );
}
