package com.mangafrik.contract;

public interface MapperContract<S, T> {
	T toDto(S source);
}

