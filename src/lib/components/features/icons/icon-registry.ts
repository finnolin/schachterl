import type { Component } from 'svelte';

import StickyNoteIcon from '~icons/lucide/sticky-note';
import FileTextIcon from '~icons/lucide/file-text';
import BookOpenIcon from '~icons/lucide/book-open';
import ClipboardListIcon from '~icons/lucide/clipboard-list';
import BoxesIcon from '~icons/lucide/boxes';
import BriefcaseIcon from '~icons/lucide/briefcase';
import LightbulbIcon from '~icons/lucide/lightbulb';
import HashIcon from '~icons/lucide/hash';
import FolderIcon from '~icons/lucide/folder';
import FolderTreeIcon from '~icons/lucide/folder-tree';
import LibraryBigIcon from '~icons/lucide/library-big';
import ArchiveIcon from '~icons/lucide/archive';
import RocketIcon from '~icons/lucide/rocket';
import CompassIcon from '~icons/lucide/compass';
import ListTreeIcon from '~icons/lucide/list-tree';
import NetworkIcon from '~icons/lucide/network';
import LinkIcon from '~icons/lucide/link';
import ImageIcon from '~icons/lucide/image';
import ServerIcon from '~icons/lucide/server';
import ListIcon from '~icons/lucide/list';

export type IconPickerContext = 'resource_type' | 'resource' | 'space';

export type IconOption = {
	value: string;
	label: string;
	contexts: IconPickerContext[];
	icon: Component<{ class?: string }>;
};

export const ICON_OPTIONS: IconOption[] = [
	{
		value: 'sticky-note',
		label: 'Sticky note',
		contexts: ['space', 'resource_type', 'resource'],
		icon: StickyNoteIcon
	},
	{
		value: 'file-text',
		label: 'File text',
		contexts: ['space', 'resource_type', 'resource'],
		icon: FileTextIcon
	},
	{
		value: 'book-open',
		label: 'Book open',
		contexts: ['space', 'resource_type', 'resource'],
		icon: BookOpenIcon
	},
	{
		value: 'clipboard-list',
		label: 'Clipboard list',
		contexts: ['space', 'resource_type', 'resource'],
		icon: ClipboardListIcon
	},
	{
		value: 'boxes',
		label: 'Boxes',
		contexts: ['space', 'resource_type', 'resource'],
		icon: BoxesIcon
	},
	{
		value: 'briefcase',
		label: 'Briefcase',
		contexts: ['space', 'resource_type', 'resource'],
		icon: BriefcaseIcon
	},
	{
		value: 'lightbulb',
		label: 'Lightbulb',
		contexts: ['space', 'resource_type', 'resource'],
		icon: LightbulbIcon
	},
	{
		value: 'hash',
		label: 'Hash',
		contexts: ['space', 'resource_type', 'resource'],
		icon: HashIcon
	},
	{
		value: 'folder',
		label: 'Folder',
		contexts: ['space', 'resource_type', 'resource'],
		icon: FolderIcon
	},
	{
		value: 'folder-tree',
		label: 'Folder tree',
		contexts: ['space', 'resource_type', 'resource'],
		icon: FolderTreeIcon
	},
	{
		value: 'library-big',
		label: 'Library',
		contexts: ['space', 'resource_type', 'resource'],
		icon: LibraryBigIcon
	},
	{
		value: 'archive',
		label: 'Archive',
		contexts: ['space', 'resource_type', 'resource'],
		icon: ArchiveIcon
	},
	{
		value: 'rocket',
		label: 'Rocket',
		contexts: ['space', 'resource_type', 'resource'],
		icon: RocketIcon
	},
	{
		value: 'compass',
		label: 'Compass',
		contexts: ['space', 'resource_type', 'resource'],
		icon: CompassIcon
	},
	{
		value: 'list-tree',
		label: 'List tree',
		contexts: ['space', 'resource_type', 'resource'],
		icon: ListTreeIcon
	},
	{
		value: 'network',
		label: 'Network',
		contexts: ['space', 'resource_type', 'resource'],
		icon: NetworkIcon
	},
	{
		value: 'link',
		label: 'Link',
		contexts: ['space', 'resource_type', 'resource'],
		icon: LinkIcon
	},
	{
		value: 'image',
		label: 'Image',
		contexts: ['space', 'resource_type', 'resource'],
		icon: ImageIcon
	},
	{
		value: 'server',
		label: 'Server',
		contexts: ['space', 'resource_type', 'resource'],
		icon: ServerIcon
	},
	{
		value: 'list',
		label: 'List',
		contexts: ['space', 'resource_type', 'resource'],
		icon: ListIcon
	}
];

const ICON_COMPONENT_BY_KEY = new Map(ICON_OPTIONS.map((option) => [option.value, option.icon]));

export function getIconOptionsForContext(context: IconPickerContext) {
	return ICON_OPTIONS.filter((option) => option.contexts.includes(context));
}

export function getIconComponent(icon_key: string | null | undefined) {
	if (!icon_key) return null;
	return ICON_COMPONENT_BY_KEY.get(icon_key) ?? null;
}
