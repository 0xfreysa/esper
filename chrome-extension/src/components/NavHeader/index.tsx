import React, { useCallback, useEffect, useState } from 'react';
import Back from '../../components/SvgIcons/Back';
import { SimpleToggle } from '../ToggleExtensionButton';
import { useRemoteAttestation } from '../../reducers/remote-attestation';
import { useExtensionEnabled } from '../../reducers/requests';
import logo from '../../assets/img/freysa-logo-white.png';
import Settings from '../../components/SvgIcons/Settings';

const getTitleFromPath = (path: string) => {
  const step = path.split('/').pop() || '';
  const titles: { [key: string]: string } = {
    requests: 'Requests',
    history: 'Attestations',
    bookmarks: 'Bookmarks',
    all: 'Other Websites',
    websites: 'Websites',
    options: 'Settings',
    home: 'Home',
    headers: 'Notarize Request',
    payloads: 'Notarize Request',
    response: 'Notarize Response',
    advanced: 'Notarize Response',
  };
  return titles[step] || 'Esper';
};

const handleBackClick = (path: string, navigate: any) => {
  const steps = path.split('/');

  if (steps.length > 4 && steps.at(-2) === 'attestation') {
    navigate(steps.slice(0, -2).join('/'));
    return;
  }

  if (
    steps.length > 2 &&
    (steps.at(-2) === 'website' || steps.at(-2) === 'attestation')
  ) {
    if (steps.at(2) === 'all') {
      navigate('/home/all');
    } else if (steps.at(-2) === 'website') {
      navigate('/home');
    } else {
      navigate('/home?opentab=history');
    }
    return;
  }

  if (
    steps.at(-1) === 'headers' ||
    steps.at(-1) === 'payloads' ||
    steps.at(-1) === 'response' ||
    steps.at(-1) === 'advanced'
  ) {
    navigate('/requests');
    return;
  }
  if (steps.at(-1) === 'requests') {
    navigate('/options');
    return;
  }

  // special case to handle all path
  if (steps.length > 2 && steps.at(-2) === 'all') {
    navigate('/');
    return;
  }

  if (steps.length > 2 && steps.at(-1) === 'all') {
    navigate('/');
    return;
  }

  steps.pop();
  navigate(steps.join('/'));
};

export default function NavHeader({
  pathname,
  navigate,
  host,
}: {
  pathname: string;
  navigate: (path: string) => void;
  host?: string;
}) {
  const { error, isValid } = useRemoteAttestation();
  const [isExtensionEnabled, setIsExtensionEnabled] = useExtensionEnabled();
  const [extensionStatus, setExtensionStatus] = useState<boolean | null>(null);

  useEffect(() => {
    setExtensionStatus(isExtensionEnabled);
  }, [isExtensionEnabled]);

  const renderHeader = () => {
    const steps = pathname.split('/');

    if (steps.at(-2) === 'attestation') {
      return (
        <div className="cursor-pointer leading-6 text-[1rem] flex items-center mx-auto">
          {host}
        </div>
      );
    }

    if (steps.length > 2 && steps.at(-2) === 'website') {
      return (
        <div className="cursor-pointer leading-6 text-[1rem] mx-auto text-text">
          {decodeURIComponent(steps.at(-1) || '')}
        </div>
      );
    }

    if (pathname === '/home') {
      return (
        <div className="cursor-pointer leading-6 text-[1rem] mx-auto text-text">
          <img src={logo} alt="logo" height={34} width={108} />
        </div>
      );
    }

    return (
      <div className="cursor-pointer leading-6 text-[1rem] mx-auto text-text">
        {getTitleFromPath(pathname)}
      </div>
    );
  };

  const renderStatus = () => {
    if (isValid == null || extensionStatus == null) return ' ';
    if (extensionStatus) return 'Active';
    else return 'Disabled';
  };

  return (
    <div
      className={`flex flex-nowrap flex-shrink-0 flex-row items-center relative gap-2 py-4 px-4 cursor-default w-full ${
        pathname === '/home' ? 'bg-mainDark' : 'bg-secDark'
      }`}
    >
      {pathname !== '/home' ? (
        <div
          className="h-8 w-8 cursor-pointer hover:opacity-70 border border-darkGrayOutline rounded-md flex items-center justify-center"
          onClick={() => handleBackClick(pathname, navigate)}
        >
          <Back />
        </div>
      ) : (
        <div
          onClick={() => navigate('/options')}
          className="w-6 h-6 border border-[transparent] cursor-pointer hover:opacity-70 text-text"
        >
          <Settings />
        </div>
      )}
      <div className="flex-1 flex items-center justify-center">
        {renderHeader()}
        {/* {pathname} */}
      </div>
      <div className="ml-auto flex flex-col items-center justify-center w-8 h-7">
        <SimpleToggle onToggle={() => setExtensionStatus((p) => !p)} />
        <div className="text-[8px]">{renderStatus()}</div>
      </div>
    </div>
  );
}
