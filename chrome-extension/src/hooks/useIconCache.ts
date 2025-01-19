import { useState, useCallback } from 'react';

export function useIconCache() {
  const [cachedIcons, setCachedIcons] = useState<Record<string, string>>({});

  const cacheIcon = useCallback(async (iconUrl: string) => {
    try {
      const response = await fetch(iconUrl, {
        cache: 'force-cache',
      });
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error caching icon:', error);
      return iconUrl;
    }
  }, []);

  const cacheIcons = useCallback(
    async (urls: string[]) => {
      const newCachedIcons: Record<string, string> = {};
      await Promise.all(
        urls.map(async (url) => {
          if (url && !cachedIcons[url]) {
            newCachedIcons[url] = await cacheIcon(url);
          }
        }),
      );
      setCachedIcons((prev) => ({ ...prev, ...newCachedIcons }));
    },
    [cachedIcons, cacheIcon],
  );

  return { cachedIcons, cacheIcons };
}
