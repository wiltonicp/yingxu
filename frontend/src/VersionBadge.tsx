import metadata from '../package.json';

/** Frontend release version, kept in sync with the npm lockfile. */
export function VersionBadge(){
 return <small className="app-version" aria-label={'映序前端版本 '+metadata.version} title="前端版本">映序 <span>v{metadata.version}</span></small>;
}
