import React, { ReactElement, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BookmarkManager } from '../../reducers/bookmarks';
import { Bookmark } from '../../reducers/bookmarks';
import WebsiteButton from '../../components/WebsiteButton';
import WebsiteIcons from '../../components/WebsiteIcons';

const bookmarkManager = new BookmarkManager();
export default function Bookmarks(props: {
  indexStart: number;
  indexEnd: number;
}): ReactElement {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const fetchBookmarks = useCallback(async () => {
    const bookmarks = await bookmarkManager.getBookmarks();
    const subset = bookmarks.slice(props.indexStart, props.indexEnd);

    setBookmarks(subset);
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  return (
    <div className="flex flex-col flex-nowrap">
      <div className="grid grid-cols-2 gap-4">
        {bookmarks.length > 0 &&
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
                  navigate(`/home/website/${bookmark.id}`);
                  return;
                }}
              />
            );
          })}
      </div>
    </div>
  );
}
