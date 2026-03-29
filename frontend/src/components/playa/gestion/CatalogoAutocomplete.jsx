import React, { useMemo, useState, useRef, useEffect } from 'react';

function optionKey(o, index) {
    if (o.id_tipo != null) return `t-${o.id_tipo}`;
    if (o.id_marca != null) return `m-${o.id_marca}`;
    if (o.id_modelo != null) return `o-${o.id_modelo}`;
    return `x-${index}-${o.nombre}`;
}

/**
 * Campo de texto con sugerencias del catálogo: al escribir se filtran las opciones.
 * El valor guardado sigue siendo el texto (nombre); se puede elegir de la lista o escribir a mano.
 */
export default function CatalogoAutocomplete({
    label,
    value,
    onChange,
    options = [],
    required = false,
    placeholder = 'Escriba para buscar…',
    hint,
    disabled = false,
    id: inputId,
}) {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const wrapRef = useRef(null);

    const filtered = useMemo(() => {
        const list = Array.isArray(options) ? options : [];
        const q = (value || '').trim().toLowerCase();
        const base = q
            ? list.filter((o) => (o.nombre || '').toLowerCase().includes(q))
            : list;
        return base.slice(0, 50);
    }, [options, value]);

    useEffect(() => {
        setHighlight(0);
    }, [value, filtered.length]);

    useEffect(() => {
        const onDoc = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const pick = (nombre) => {
        onChange(nombre);
        setOpen(false);
    };

    const onKeyDown = (e) => {
        if (!open || filtered.length === 0) {
            if (e.key === 'ArrowDown' && filtered.length) setOpen(true);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const row = filtered[highlight];
            if (row) pick(row.nombre);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="form-group catalog-autocomplete-wrap" ref={wrapRef}>
            {label && (
                <label htmlFor={inputId}>
                    {label}
                    {required ? <span className="catalog-autocomplete-req"> *</span> : null}
                </label>
            )}
            <input
                id={inputId}
                type="text"
                autoComplete="off"
                disabled={disabled}
                placeholder={placeholder}
                value={value ?? ''}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                required={required}
            />
            {hint && <p className="catalog-autocomplete-hint">{hint}</p>}
            {open && filtered.length > 0 && !disabled && (
                <ul className="catalog-autocomplete-list" role="listbox">
                    {filtered.map((o, i) => (
                        <li
                            key={optionKey(o, i)}
                            role="option"
                            aria-selected={i === highlight}
                            className={i === highlight ? 'is-highlight' : ''}
                            onMouseEnter={() => setHighlight(i)}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                pick(o.nombre);
                            }}
                        >
                            {o.nombre}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
