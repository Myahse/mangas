package com.mangafriq.contract;

public interface MapperContract<S, T> {
	T toDto(S source);
}

