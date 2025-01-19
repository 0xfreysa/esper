import React from 'react';
import { ReactElement, ReactNode, MouseEventHandler } from 'react';
import classNames from 'classnames';

export default function WebsiteButton(props: {
  ImageIcon: ReactNode;
  title: string;
  subtitle: string;

  onClick?: MouseEventHandler;
  className?: string;
  disabled?: boolean;
}): ReactElement {
  const { ImageIcon, title, subtitle, onClick, className, disabled } = props;
  return (
    <button
      className={classNames(
        'flex flex-col flex-nowrap overflow-hidden text-left',
        'rounded-xl px-4 py-4',
        'bg-providerTile hover:bg-[#252523] cursor-pointer min-h-[128px] shadow-sm',
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex justify-center items-center h-8 w-8 mb-4">
        {ImageIcon}
      </div>

      <span className="text-text text-[14px] font-medium leading-[16px]">
        {title}
      </span>
      <span className="text-xs text-text truncate max-w-full">{subtitle}</span>
    </button>
  );
}
