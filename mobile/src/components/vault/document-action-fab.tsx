import { useMemo } from 'react';
import {
  Check,
  Copy,
  Download,
  MoreVertical,
  Share2,
  Trash2,
} from 'lucide-react-native';

import { SpeedDial, type SpeedDialAction } from '@/components/ui/speed-dial';

export interface DocumentActionFabProps {
  onCopy: () => void | Promise<void>;
  onShare: () => void | Promise<void>;
  onDownload: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  copied?: boolean;
  sharing?: boolean;
  downloading?: boolean;
  bottom?: number;
  right?: number;
  blurTarget?: React.RefObject<any>;
  accessibilityLabel?: string;
}

/**
 * Reusable multi-action Floating Action Button for single document views
 * (Cover Letters and Résumés). Expands with cascading animations into:
 * - Copy text (with haptic feedback)
 * - Share PDF (native system share sheet)
 * - Download PDF (saves / exports file)
 * - Delete document (destructive red action)
 */
export function DocumentActionFab({
  onCopy,
  onShare,
  onDownload,
  onDelete,
  copied = false,
  sharing = false,
  downloading = false,
  bottom,
  right,
  blurTarget,
  accessibilityLabel = 'Document actions',
}: DocumentActionFabProps) {
  const actions = useMemo<SpeedDialAction[]>(() => [
    {
      key: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      accessibilityLabel: 'Delete document',
      onPress: onDelete,
    },
    {
      key: 'download',
      label: downloading ? 'Downloading…' : 'Download PDF',
      icon: Download,
      accessibilityLabel: 'Download PDF',
      onPress: onDownload,
    },
    {
      key: 'share',
      label: sharing ? 'Sharing…' : 'Share PDF',
      icon: Share2,
      accessibilityLabel: 'Share PDF',
      onPress: onShare,
    },
    {
      key: 'copy',
      label: copied ? 'Copied' : 'Copy Text',
      icon: copied ? Check : Copy,
      accessibilityLabel: copied ? 'Copied text to clipboard' : 'Copy plain text to clipboard',
      onPress: onCopy,
    },
  ], [copied, downloading, onDelete, onDownload, onCopy, onShare, sharing]);

  return (
    <SpeedDial
      actions={actions}
      icon={MoreVertical}
      accessibilityLabel={accessibilityLabel}
      bottom={bottom}
      right={right}
      blurTarget={blurTarget}
    />
  );
}
