import { act, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../lib/auth';
import { activeConfigStore, attemptsStore } from '../lib/storage';
import { defaultConfig } from '../lib/config';
import { bundledPassages } from '../data/catalog';
import Results from './Results';
import TestPage from './Test';

const passage = bundledPassages[0];

function mount() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/test']}>
        <Routes>
          <Route path="/test" element={<TestPage />} />
          <Route path="/results/:id" element={<Results />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  activeConfigStore.set({ ...defaultConfig(passage, 'practice'), durationSec: 60, minAccuracy: 90 });
});

describe('typing workspace', () => {
  it('renders the Marathi passage and an editable Unicode textarea', () => {
    mount();
    expect(screen.getByTestId('reference').textContent).toBe(passage.text);
    const ta = screen.getByTestId('typing-area') as HTMLTextAreaElement;
    expect(ta.tagName).toBe('TEXTAREA');
    expect(ta).toHaveAttribute('lang', 'mr');
  });

  it('preserves Marathi text exactly (no rewriting of typed characters)', () => {
    mount();
    const ta = screen.getByTestId('typing-area') as HTMLTextAreaElement;
    const typed = 'माझे नाव क्ष त्र ज्ञ माँ संतांची';
    fireEvent.change(ta, { target: { value: typed } });
    expect(ta.value).toBe(typed);
  });

  it('blocks paste when paste is disabled', () => {
    mount();
    const ta = screen.getByTestId('typing-area');
    const ev = createEvent.paste(ta, { clipboardData: { getData: () => 'x' } });
    fireEvent(ta, ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('timer starts on first character and the finish button enables', () => {
    mount();
    expect(screen.getByTestId('finish')).toBeDisabled();
    fireEvent.change(screen.getByTestId('typing-area'), { target: { value: 'म' } });
    expect(screen.getByTestId('finish')).toBeEnabled();
  });

  it('finishing a perfect attempt saves once and shows a passed result', async () => {
    mount();
    fireEvent.change(screen.getByTestId('typing-area'), { target: { value: passage.text } });
    const btn = screen.getByTestId('finish');
    await act(async () => {
      fireEvent.click(btn);
      fireEvent.click(btn); // double click must not create a second record
    });
    await waitFor(() => expect(screen.getByText(/उत्तीर्ण · Passed/)).toBeInTheDocument());
    const all = attemptsStore.list();
    expect(all).toHaveLength(1);
    expect(all[0].accuracy).toBe(100);
    expect(all[0].passed).toBe(true);
    expect(all[0].entered).toBe(passage.text);
    expect(all[0].reference).toBe(passage.text);
  });

  it('a poor attempt fails and explains every reason in Marathi', async () => {
    mount();
    fireEvent.change(screen.getByTestId('typing-area'), { target: { value: 'चुकीचा मजकूर पूर्ण वेगळा' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('finish'));
    });
    await waitFor(() => expect(screen.getByText(/अनुत्तीर्ण · Not passed/)).toBeInTheDocument());
    expect(screen.getByText(/अचूकता .*% आहे; किमान 90% आवश्यक/)).toBeInTheDocument();
  });

  it('shows a helpful message when no test is configured', () => {
    sessionStorage.clear();
    mount();
    expect(screen.getByText(/आधी टेस्ट निवडा/)).toBeInTheDocument();
  });
});
