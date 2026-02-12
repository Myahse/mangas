import { useParams } from 'react-router-dom'
import './MangaDetail.css'

export default function MangaDetail() {
  const { id } = useParams()

  return (
    <div className="page">
      <h1>Manga Detail</h1>
      <p>ID: {id}</p>
    </div>
  )
}
