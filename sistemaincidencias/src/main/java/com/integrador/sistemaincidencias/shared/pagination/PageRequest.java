package com.integrador.sistemaincidencias.shared.pagination;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageRequest {

    private int page;
    private int size;

    public static PageRequest of(Integer page, Integer size) {
        int safePage = page == null || page < 0 ? 0 : page;
        int safeSize = size == null || size < 1 ? 20 : Math.min(size, 100);
        return PageRequest.builder().page(safePage).size(safeSize).build();
    }

    public int offset() {
        return page * size;
    }
}
