import React, { ReactElement } from 'react';

import { useRemoteAttestation } from '../../reducers/remote-attestation';

import { useExtensionEnabled } from '../../reducers/requests';
import Lock from '../SvgIcons/Lock';

export default function RemoteAttestationBadge(): ReactElement {
  const { remoteAttestation, loading, error, isValid } = useRemoteAttestation();
  const isExtensionEnabled = useExtensionEnabled();

  if (isValid === null) return <>Invalid</>;
  return (
    <>
      <div className="mt-5 items-center">
        <>
          {isValid ? (
            <div
              className="inline-flex items-center gap-2.5"
              role="status"
              aria-live="polite"
            >
              <Lock />
              <span className="text-xs font-medium text-brand">
                Connection is secure
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-error rounded-full"></div>
                <div className="w-1"></div>
                <span className="text-xs mr-2 text-error">
                  {' '}
                  Notary Not Authenticated
                </span>
              </div>

              <div className="text-xs mr-2 text-textGray">{error}</div>
            </>
          )}
        </>
      </div>
    </>
  );
}
