import { NextResponse } from "next/server";

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return NextResponse.json({
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
