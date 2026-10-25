'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';

// Select values for "new category" and "no category". Radix does not allow empty item values.
const NEW_CATEGORY = '__new__';
const NO_CATEGORY = '__none__';

interface CategorySelectProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    categories: Array<string>;
    allowEmpty: boolean;
}

const CategorySelect = ({ id, value, onChange, categories, allowEmpty }: CategorySelectProps): ReactElement => {
    const [isNew, setIsNew] = useState(value !== '' && !categories.includes(value));

    const selectValue = isNew ? NEW_CATEGORY : value === '' && allowEmpty ? NO_CATEGORY : value;

    const onSelect = (selected: string): void => {
        setIsNew(selected === NEW_CATEGORY);
        onChange(selected === NEW_CATEGORY || selected === NO_CATEGORY ? '' : selected);
    };

    return (
        <div className="grid gap-2">
            <Select value={selectValue} onValueChange={onSelect}>
                <SelectTrigger id={id}>
                    <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                    {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                            {category}
                        </SelectItem>
                    ))}
                    <SelectSeparator />
                    {allowEmpty && <SelectItem value={NO_CATEGORY}>Keine Kategorie</SelectItem>}
                    <SelectItem value={NEW_CATEGORY}>Neue Kategorie …</SelectItem>
                </SelectContent>
            </Select>
            {isNew && (
                <Input
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="Name der neuen Kategorie"
                    autoComplete="off"
                    maxLength={100}
                    aria-label="Name der neuen Kategorie"
                />
            )}
        </div>
    );
};

export default CategorySelect;
