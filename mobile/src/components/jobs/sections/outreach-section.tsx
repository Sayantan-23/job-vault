import { Linking } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Card } from '@/components/ui/card';
import { useJobContacts } from '@/hooks/use-contacts';
import { shortDate } from '@/lib/relative-time';
import type { ContactChannel, JobContact } from '@/types/contact';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?\(?\d[\d\s().-]{7,}\d)/;

export type ContactTarget = { kind: 'email' | 'phone' | 'none'; value: string; href: string | null };

// Free-text contact → a tappable target. EMAIL channel hints mailto; otherwise
// regex-extract an email or phone from the string; else plain text.
// ponytail: regex-extract from free-text contact — structured fields would be
// better, backend change is t-0018-adjacent.
export function parseContact(contact: JobContact): ContactTarget {
  const text = contact.contact;
  const channelHint: ContactChannel | null = contact.channel;
  if (channelHint === 'EMAIL') {
    const m = text.match(EMAIL_RE);
    if (m) return { kind: 'email', value: m[0], href: `mailto:${m[0]}` };
  }
  const emailMatch = text.match(EMAIL_RE);
  if (emailMatch) return { kind: 'email', value: emailMatch[0], href: `mailto:${emailMatch[0]}` };
  const phoneMatch = text.match(PHONE_RE);
  if (phoneMatch) return { kind: 'phone', value: phoneMatch[0], href: `tel:${phoneMatch[0].replace(/[^\d+]/g, '')}` };
  return { kind: 'none', value: text, href: null };
}

function ContactRow({ contact }: { contact: JobContact }) {
  const target = parseContact(contact);
  return (
    <Card>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          {target.href ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Contact ${target.value}`}
              onPress={() => void Linking.openURL(target.href!)}>
              <Text className="text-sm text-primary underline">{target.value}</Text>
            </Pressable>
          ) : (
            <Text className="text-sm text-foreground">{target.value}</Text>
          )}
          <Text className="mt-1 font-mono text-xs text-muted-foreground">
            Reached out {shortDate(contact.reachedOutAt)}
          </Text>
          {contact.notes ? (
            <Text className="mt-1 text-xs text-muted-foreground">{contact.notes}</Text>
          ) : null}
        </View>
        <View className="shrink-0">
          <Text className="text-xs text-muted-foreground">{contact.status}</Text>
        </View>
      </View>
    </Card>
  );
}

export function OutreachSection({ jobId }: { jobId: string }) {
  const { data: contacts = [], isLoading } = useJobContacts(jobId);

  return (
    <View className="gap-3">
      <Text className="font-sans-medium text-sm text-foreground">Outreach</Text>
      {isLoading ? (
        <Text className="text-sm text-muted-foreground">Loading…</Text>
      ) : contacts.length === 0 ? (
        <Text className="text-sm text-muted-foreground">
          No outreach yet. Track who you&apos;ve contacted for a referral.
        </Text>
      ) : (
        <View className="gap-2">
          {contacts.map((contact) => (
            <ContactRow key={contact.id} contact={contact} />
          ))}
        </View>
      )}
    </View>
  );
}
