import { fireEvent, render, screen } from '@testing-library/react-native';

import { withSafeArea } from '@/components/ui/test-safe-area';
import type { ProfileExperience } from '@/types/profile';
import { EditExperienceSheet } from './edit-experience-sheet';

const mockExp: ProfileExperience = {
  id: 'exp-1',
  company: 'Stripe',
  role: 'Staff Engineer',
  employmentType: 'full-time',
  location: 'San Francisco, CA',
  startDate: { month: 1, year: 2021 },
  endDate: null,
  current: true,
  bullets: ['Scaled payment infra to 10k TPS'],
};

describe('EditExperienceSheet', () => {
  it('renders existing experience data', async () => {
    await render(
      withSafeArea(
        <EditExperienceSheet
          open={true}
          onOpenChange={jest.fn()}
          experience={mockExp}
          onSave={jest.fn()}
        />
      )
    );

    expect(screen.getByText('Edit role')).toBeTruthy();
    expect(screen.getByDisplayValue('Stripe')).toBeTruthy();
    expect(screen.getByDisplayValue('Staff Engineer')).toBeTruthy();
  });

  it('validates required fields before calling onSave', async () => {
    const onSave = jest.fn();
    await render(
      withSafeArea(
        <EditExperienceSheet
          open={true}
          onOpenChange={jest.fn()}
          experience={null}
          onSave={onSave}
        />
      )
    );

    await fireEvent.press(screen.getByLabelText('Save role'));
    expect(screen.getByText('Company is required')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with updated data when fields are filled', async () => {
    const onSave = jest.fn();
    const onOpenChange = jest.fn();
    await render(
      withSafeArea(
        <EditExperienceSheet
          open={true}
          onOpenChange={onOpenChange}
          experience={null}
          onSave={onSave}
        />
      )
    );

    await fireEvent.changeText(screen.getByLabelText('Company'), 'Google');
    await fireEvent.changeText(screen.getByLabelText('Role'), 'SWE III');
    await fireEvent.changeText(screen.getByLabelText('Start year'), '2023');
    await fireEvent.press(screen.getByText('I currently work here'));

    await fireEvent.press(screen.getByLabelText('Save role'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        company: 'Google',
        role: 'SWE III',
        current: true,
      })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
