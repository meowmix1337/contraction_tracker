import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';

// jsdom doesn't implement showModal/close; stub them
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

describe('ConfirmDialog', () => {
  it('dialog element is not open when closed', () => {
    const { container } = render(<ConfirmDialog open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const dialog = container.querySelector('dialog');
    expect(dialog).not.toHaveAttribute('open');
  });

  it('shows content when open', () => {
    render(<ConfirmDialog open={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Clear all data?')).toBeTruthy();
    expect(screen.getByText('Clear data')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('calls onConfirm when "Clear data" is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open={true} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Clear data'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when "Cancel" is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open={true} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
