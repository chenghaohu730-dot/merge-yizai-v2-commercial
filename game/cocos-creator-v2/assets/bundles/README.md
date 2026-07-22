# V2.0 local Asset Bundles

These directories are the committed Cocos Asset Bundle roots. In Cocos Creator 3.8.8, configure every directory below as a local Asset Bundle. `core_game`, `meta_ui`, and every `skin_*_v2` directory use the `subpackage` compression type for WeChat Mini Game builds. None is a remote bundle.

The current PNG files remain in their audited source paths until they pass the commercial-art gate. `bundle-entry.json` records the source-to-bundle move contract so build validation can reject an incomplete import instead of silently placing assets in `main`.
