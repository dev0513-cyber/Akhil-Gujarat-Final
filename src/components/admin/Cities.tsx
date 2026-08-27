"use client";
import { fetchCities, saveCity, deleteCity } from '../../lib/api';
import { TaxonomyManager } from './TaxonomyManager';
import type { City } from '../../lib/types';

export default function Cities({ initialCities }: { initialCities: City[] }) {
  return (
    <TaxonomyManager<City>
      initialData={initialCities}
      cacheKey="cities"
      fetcher={fetchCities}
      saver={saveCity}
      deleter={deleteCity}
      titleEn="Cities"
      titleGu="શહેરો"
      descriptionEn="Dynamic list for city coverage."
      descriptionGu="શહેરી કવરેજ માટે ડાયનેમિક સૂચિ."
      hasDescriptionField={false}
    />
  );
}
