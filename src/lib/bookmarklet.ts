import { DEEP_LINK_ACTION, DEEP_LINK_SCHEME, DEEP_LINK_URL_PARAM } from '@/lib/deep-link';

export const BOOKMARKLET_CODE =
    `javascript:(function(){window.location.href='${DEEP_LINK_SCHEME}://${DEEP_LINK_ACTION}?${DEEP_LINK_URL_PARAM}='+encodeURIComponent(window.location.href);})();`;
