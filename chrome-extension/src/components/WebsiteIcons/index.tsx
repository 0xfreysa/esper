import React from 'react';

import ubereats from '../../assets/website-icons/ubereats.png';
import chase from '../../assets/website-icons/chase.png';
import reddit from '../../assets/website-icons/reddit.png';
import ssa from '../../assets/website-icons/ssa.png';
import robinhood from '../../assets/website-icons/robinhood.png';
import chatgpt from '../../assets/website-icons/chatgpt.png';
import twitter from '../../assets/website-icons/twitter.png';
import twitterPremium from '../../assets/website-icons/twitter-premium.png';

const icons = {
  ubereats,
  chase,
  reddit,
  ssa,
  robinhood,
  chatgpt,
  twitter,
  twitterPremium,
};

export default function WebsiteIcons({ website }: { website: string }) {
  if (!website) return <></>;
  else
    return (
      <img
        src={icons[website as keyof typeof icons]}
        className="w-8 h-8"
        alt={website}
      />
    );
}
