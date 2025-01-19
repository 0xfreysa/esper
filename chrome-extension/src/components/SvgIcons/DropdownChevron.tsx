import React from 'react';

export default function DropdownChevron({ reverse }: { reverse: boolean }) {
  return (
    <svg
      width="11"
      height="7"
      viewBox="0 0 11 7"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${reverse ? 'rotate-180 transition-transform duration-300' : 'transition-transform duration-300'}`}
    >
      <path
        d="M10.3984 1.05017L6.1558 5.29281C5.76527 5.68333 5.13211 5.68333 4.74158 5.29281L0.498943 1.05017"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}
