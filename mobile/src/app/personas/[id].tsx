import { useLocalSearchParams } from 'expo-router';
import { PersonaEditorScreen } from '@/components/personas/persona-editor-screen';

export default function PersonaDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PersonaEditorScreen id={id as string} />;
}
