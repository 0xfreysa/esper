import React, { ReactElement, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ErrorModal } from '../../components/ErrorModal';
import FavouriteStar from '../../components/SvgIcons/FavouriteStar';
import ChevronRight from '../../components/SvgIcons/ChevronRight';
import Bookmarks from '../Bookmarks';
import NavButton from '../../components/NavButton';
import History from '../History';
import { useSearchParams } from 'react-router-dom';

export default function Home(): ReactElement {
  const navigate = useNavigate();
  const [error, showError] = useState('');
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history'>(
    'bookmarks',
  );
  const [searchParams] = useSearchParams();
  const openTab = searchParams.get('opentab');
  const [showMoreWebsites, setShowMoreWebsites] = useState(false);
  useEffect(() => {
    if (openTab) {
      setActiveTab(openTab as 'bookmarks' | 'history');
    }
  }, [openTab]);

  return (
    <div className="flex flex-col overflow-y-auto flex-1 bg-mainDark">
      {error && <ErrorModal onClose={() => showError('')} message={error} />}

      <div className="flex mx-4 gap-6 pb-4">
        {[
          { key: 'bookmarks', title: 'Websites' },
          { key: 'history', title: 'Verifications' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`pt-5 pb-3 font-inter text-[20px] border-b-2 font-medium leading-[16px] slashed-zero text-brand hover:text-brandHover ${
              activeTab === tab.key ? 'border-brand' : 'border-transparent'
            }`}
            onClick={() => setActiveTab(tab.key as 'bookmarks' | 'history')}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {activeTab === 'bookmarks' ? (
        <div className="flex flex-col gap-4 overflow-y-auto flex-1 pb-8 px-4">
          <Bookmarks indexStart={0} indexEnd={showMoreWebsites ? 8 : 4} />
          <div className="flex flex-col flex-nowrap justify-center gap-4">
            <NavButton
              title="Other Websites"
              subtitle=""
              onClick={() => navigate('/home/all')}
              className="h-[74px]"
            />
          </div>
        </div>
      ) : (
        <History />
      )}
    </div>
  );
}
