// src/features/users/userSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

export const fetchUsers = createAsyncThunk('users/fetchAll', async () => {
  const response = await axios.get('/api/users')
  return response.data.data
})

const userSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    isLoading: false,
    error: null
  },
  reducers: {

    addUser: (state, action) => {
      state.users.push(action.payload)
    },
    removeUser: (state, action) => {
      state.users = state.users.filter(user => user.id !== action.payload.id)
    },
    updateUser: (state, action) => {
      const index = state.users.findIndex(user => user.id === action.payload.id)
      if (index !== -1) {
        state.users[index] = action.payload
      }
    }
    
  },
  extraReducers: builder => {
    builder
      .addCase(fetchUsers.pending, state => {
        state.isLoading = true
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false
        state.users = action.payload
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message
      })
  }
})

export default userSlice.reducer
