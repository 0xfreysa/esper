import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import NavButton from '../../components/NavButton';
import FavouriteStar from '../../components/SvgIcons/FavouriteStar';
import { useAllWebsites } from '../../reducers/history';
import { Favorite, FavoritesManager } from '../../reducers/favorites';
import {
  Bookmark,
  BookmarkManager,
  useBookmarks,
} from '../../reducers/bookmarks';
import { extractHostFromUrl, extractPathFromUrl } from '../../utils/misc';
import WebsiteButton from '../../components/WebsiteButton';
import Globe from '../../components/SvgIcons/Globe';

import ubereats from '../../assets/website-icons/ubereats.png';
import WebsiteIcons from '../../components/WebsiteIcons';

const bookmarkManager = new BookmarkManager();

export default function Websites({
  allWebsites = false,
}: {
  allWebsites?: boolean;
}) {
  const [bookmarks, setBookmarks] = useBookmarks();

  const fetchBookmarks = useCallback(async () => {
    const bookmarks = await bookmarkManager.getBookmarks();
    const subset = bookmarks.slice(4, bookmarks.length);
    setBookmarks(subset);
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const navigate = useNavigate();
  const websites = useAllWebsites();

  return (
    <div className="flex flex-col gap-4 py-4 overflow-y-auto flex-1 px-4">
      <div className="flex flex-col flex-nowrap">
        <div className="grid grid-cols-2 gap-4 pb-1">
          {allWebsites &&
            bookmarks?.length > 0 &&
            bookmarks.map((bookmark) => {
              return (
                <WebsiteButton
                  ImageIcon={
                    bookmark.icon ? (
                      <WebsiteIcons website={bookmark.icon} />
                    ) : (
                      <div className="w-8 h-8 bg-transparent rounded-sm" />
                    )
                  }
                  title={bookmark.title}
                  subtitle={bookmark.description}
                  onClick={() => {
                    navigate(`/home/all/website/${bookmark.id}`);
                    return;
                  }}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}
