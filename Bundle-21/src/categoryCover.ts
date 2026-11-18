/**
 * Baleshhaa — approved category photographs.
 *
 * The first 14 categories have real WebP artwork shipped with the website in
 * public/art/categories. They must not fall back to the SVG illustration IDs
 * from the Neon catalogue. Questions (flags, maps, etc.) still use image_id
 * and Neon Object Storage independently.
 *
 * Future category art can be dynamic: remove a name here after assigning it
 * a suitable photographic image_id in app_media.
 */
import {API_BASE,type PublicCategory} from './api';
import {assetImageUrl} from './imageApi';

export const APPROVED_CATEGORY_COVERS:Readonly<Record<string,string>>={
 'دوري أبطال أوروبا':'/art/categories/ucl.webp',
 'برشلونة':'/art/categories/barcelona.webp',
 'ريال مدريد':'/art/categories/realmadrid.webp',
 'الكلاسيكو':'/art/categories/clasico.webp',
 'كأس العالم':'/art/categories/world-cup.webp',
 'كأس العالم 2026':'/art/categories/world-cup-2026.webp',
 'كأس العالم 2022':'/art/categories/world-cup-2022.webp',
 'القرآن الكريم':'/art/categories/quran.webp',
 'السيرة النبوية':'/art/categories/seerah.webp',
 'قصص الأنبياء':'/art/categories/prophets.webp',
 'الصحابة':'/art/categories/sahaba.webp',
 'أعلام':'/art/categories/flags.webp',
 'دول وعواصم':'/art/categories/capitals.webp',
 'جغرافيا':'/art/categories/geography.webp'
};

export function categoryCoverSrc(c:Pick<PublicCategory,'title_ar'|'imageId'|'imageUrl'>):string{
 const approved=APPROVED_CATEGORY_COVERS[c.title_ar.trim()];
 if(approved)return approved;
 const linked=assetImageUrl(c.imageId);
 if(linked)return linked;
 return c.imageUrl?API_BASE+c.imageUrl:'';
}
