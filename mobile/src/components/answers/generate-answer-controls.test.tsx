import { fireEvent, render, screen } from '@testing-library/react-native';

import { GenerateAnswerControls } from './generate-answer-controls';

const mockPersonas = [
  { id: 'p-1', name: 'Software Architect', createdAt: '', updatedAt: '', userId: '' },
  { id: 'p-2', name: 'Engineering Manager', createdAt: '', updatedAt: '', userId: '' },
];

const mockJobs = [
  { id: 'j-1', title: 'Principal Engineer', company: 'Acme' },
  { id: 'j-2', title: 'Staff Engineer', company: 'Stripe' },
];

describe('GenerateAnswerControls', () => {
  it('renders persona and job options', async () => {
    await render(
      <GenerateAnswerControls
        personas={mockPersonas}
        jobs={mockJobs}
        question="Tell me about yourself"
        onGenerate={jest.fn()}
        isGenerating={false}
      />
    );

    expect(screen.getByText('Software Architect')).toBeTruthy();
    expect(screen.getByText('None (general answer)')).toBeTruthy();
  });

  it('calls onGenerate with persona and instructions', async () => {
    const onGenerate = jest.fn();
    await render(
      <GenerateAnswerControls
        personas={mockPersonas}
        jobs={mockJobs}
        question="Tell me about yourself"
        onGenerate={onGenerate}
        isGenerating={false}
      />
    );

    await fireEvent.changeText(
      screen.getByLabelText('Extra Instructions'),
      'Focus on cloud migrations'
    );

    await fireEvent.press(screen.getByText('Generate with AI'));

    expect(onGenerate).toHaveBeenCalledWith({
      personaId: 'p-1',
      instructions: 'Focus on cloud migrations',
    });
  });
});
