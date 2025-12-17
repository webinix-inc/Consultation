// src/features/users/userAPI.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const userAPI = createApi({
  reducerPath: 'userAPI',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => 'users',
    }),
    createUser: builder.mutation({
      query: (newUser) => ({
        url: 'users',
        method: 'POST',
        body: newUser
      }),
    }),
  }),
})

export const { useGetUsersQuery, useCreateUserMutation } = userAPI
